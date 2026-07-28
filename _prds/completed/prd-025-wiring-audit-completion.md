# PRD-025: Wiring Audit Completion — The Meta-Gate That Makes a Fourth Duplicate Fail

> **Status**: Ship Verified
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `wiring-audit-completion`
> **Cycle Phase**: 7 (Closed)
> **PRD Class**: infra
> **Class Rationale**: Workflow tooling. It adds public config keys (`wiring.*`) and
> strengthens a shipped gate, so it is user-facing enough to need a changeset, but it adds
> no CLI command, no flag, and no behavior outside the wiring audit. Not `feature` because
> no new user-facing capability ships — an existing audit stops being partial.
> **Autonomous Close**: operator-gated
> **Value**: 3.75 (MF/UI/TL/AR/RM: 5/3/5/2/3)

<!-- 0.25*5 + 0.25*3 + 0.20*5 + 0.15*2 + 0.15*3
     = 1.25 + 0.75 + 1.00 + 0.30 + 0.45 = 3.75 -->

---

## 1. Introduction / Overview

Split from PRD-023 on owner direction, 2026-07-27. This is the middle piece: **the audit
and the ledger must both be complete before anything is deleted** — the audit here, the
ledger **in PRD-026**, by the owner decision of 2026-07-27 recorded below and in §5 —
because the scripts PRD-026 removes are currently the only implementation of guarantees
the package does not have.

`auditWiring` is the package's wire-or-delete meta-gate.
`scripts/verify/verify-gates-wired.mjs` is this repository's weaker copy of it — except in
four respects, where the script is the stronger one. Measured 2026-07-27:

| Capability | `verify-gates-wired.mjs` | `auditWiring` |
| ---------- | ------------------------ | ------------- |
| manifest → script existence | no | **yes** |
| registered → wired | yes | yes |
| **on-disk → registered** | **yes** | no |
| CI workflow files | whole file, comments stripped | `run:` text only |
| **the git-hooks directory** | **yes** — hardcoded `.githooks/` | no |
| **the bundle's membership** | **yes** — hardcoded path | no |
| **non-verify `package.json` script bodies** | **yes** | no |
| how a surface matches a check | script name **or** `.mjs` basename, plain substring (`verify-gates-wired.mjs:49-52`) | a package-manager invocation resolved to a script name, and nothing else (`wiring.ts:229-236`) |

**Measured impact of the four gaps today is zero.** No `.githooks/` file references a
`verify:` script and every current check has its own CI step. That is exactly why deleting
the script without porting them would pass review unnoticed and surface later as a check
that was wired all along. A guarantee with no current occupant is still a guarantee.

**The class ledger is not here, by owner decision of 2026-07-27.** An earlier draft landed
it alongside the audit. Applying the governing decision record's own test to the ledger
says otherwise: it governs which files exist under **this repository's** scripts directory
and where they belong — not PRDs, readiness records, tasks, review records, or memory
records. That is repo-class, so the ledger ships as a repo script in PRD-026, together with
the deletions whose rows it must lose. Two independent reviewers found the seam this
removes, from opposite sides. Putting a repository-local artifact into shipped package code
was the error the decision record exists to prevent, committed by the PRD implementing its
comparison.

**What this PRD deliberately does not do: delete anything.** Every deletion — root scripts,
packed twins, `PACK_MAP` entries, the exceptions file — is PRD-026, in one commit, because
`verify:pack-drift` pairs the two sides and a one-sided deletion is red in either
direction. This PRD's job is to make those deletions safe.

---

## 2. Goals

### Primary Goals

- [ ] Close every gap between `auditWiring` and the script it will replace: the missing
      direction, the three missing surfaces, and the matching rule that reads them.
- [ ] Specify the matching rule as a **narrow closed grammar** — narrow enough that it has
      no interpreter flag semantics left to get wrong. An earlier revision of this work said
      "an executing interpreter (`node`, `bun`, `tsx`, …)" and an independent review
      correctly called that unfalsifiable. The revisions after it were closed but kept
      growing, and four consecutive independent rounds each found the next defect one level
      deeper inside them; on the owner's direction of 2026-07-28 the grammar is **cut back
      rather than completed**, and its residual is stated in both directions.
- [ ] Take the three hardcoded paths the script carries into config, because this is shipped
      package code and `.githooks/` is one repository's choice.
- [ ] Leave every deletion, and the class ledger, to PRD-026 — with the audit already
      stronger than what goes away.

### Success Metrics

| Metric | Current | Target | Measurement |
| ------ | ------- | ------ | ----------- |
| Audit directions `auditWiring` lacks | 1 (on-disk to registered) | 0 | FR-1 fixture |
| Executing-surface kinds `auditWiring` lacks | 3 (hooks, bundle membership, sibling script bodies) | 0 | FR-2 fixtures |
| Invocation forms the audit recognizes | 1 (package-manager only) | 3 (manager, interpreter plus path, bundle membership) | FR-3 fixtures |
| Interpreter names accepted by the matching rule | undefined — an earlier draft ended the list with an ellipsis | a closed literal list, extended only by code change plus a test | FR-3, the list is in source and in the deny matrix |
| Command-grammar machinery specified | 4 layers plus two closed flag tables — 11 non-executing entries and 10 arity rows — applied globally to five interpreters whose spellings differ; the layer four consecutive rounds each found one level deeper | **one scanner pass and one command shape.** No flag table, no arity table, no per-interpreter semantics: any `-`-leading token before the script path refuses the command outright | FR-3(b), plus deny-matrix rows keyed to the scanner, the head token, the path position and the bundle. Every form the two deleted tables handled becomes one row of the same rule |
| Bundle grammar anchored on | "top-level" — a fact about a JavaScript parse tree that a zero-dependency scanner cannot decide | lines and columns: a column-zero opening line, a `];` closing line, three permitted line shapes between them | FR-3(c), verified against the one real bundle (`verify-workflow.mjs:15-26`, measured 2026-07-28) plus impostor, indent, escape and duplicate fixtures |
| Hardcoded repo paths, once the script's surfaces move into shipped code | 3 in the script today (hooks directory, bundle path, scripts directory); 0 in the shipped audit, which has no such surfaces yet | 0 after the port | FR-2 config keys plus validation fixtures. An earlier draft said the shipped audit holds two hardcoded paths; it holds none, because it does not read those surfaces at all |

---

## 3. User Stories

#### User Story 1

```
As a maintainer who wired a check through a git hook and nothing else,
I want the wiring audit to see it,
so that "wired nowhere" means unwired rather than unrecognized.
```

**Acceptance Criteria:**

- [ ] A check invoked only from a hook, only from the bundle's membership list, or only
      from another `package.json` script's body registers as wired.
- [ ] A check merely named in a string that nothing executes does not.
- [ ] A command that reaches the script path through **any** `-`-leading token declares no
      wiring, even when the flag is harmless. That false negative is deliberate and its
      remedies are ordinary — drop the flag, or add a justified `manifest.wiringExceptions`
      entry — because the audit reports it as "wired nowhere", never as a silent pass.

#### User Story 2

```
As an adopter whose repo uses a different hooks directory or none at all,
I want the audit's paths to come from my config,
so that a shipped gate does not assume this repository's layout.
```

**Acceptance Criteria:**

- [ ] `wiring.scriptsDir`, `wiring.hooksDir`, and `wiring.bundlePath` are configurable,
      repo-relative, and validated.
- [ ] A configured directory that does not exist is simply not a surface, not an error.

---

## 4. Functional Requirements

Each FR carries the exact target paths the implementing agent will touch. Use
`path/to/file.ts::SymbolName` notation for symbol-level targets.

1. **FR-1 — Port the missing audit direction: on-disk to registered.** `auditWiring` audits
   manifest-to-script existence and registered-to-wired.
   `verify-gates-wired.mjs` additionally audits **on-disk to registered**: every
   `verify-*.mjs` in the scripts directory must be registered as a `package.json` script.
   Deleting the script without porting that would let an unregistered script sit on disk
   unnoticed — the exact silence the meta-gate exists to prevent.

   **The predicate is stated, because `verifyScriptPattern` cannot express it.** That
   pattern is a regex over **package-script names** (`types.ts:107`) — it matches
   `verify:brain`, never the filename `verify-brain.mjs`. So this direction needs two
   separate rules and an earlier draft conflated them:

   1. **Selection.** A file under `wiring.scriptsDir` is a candidate when its basename
      matches `^verify-.*\.mjs$`. This is a filename pattern and is distinct from
      `verifyScriptPattern`; do not reuse one for the other.
   2. **Registration.** A candidate is registered when some `package.json` script whose
      **name** matches `verifyScriptPattern` has a body that **invokes that file**, decided
      by FR-3's command rule — not by a substring search. The deleted script joins every
      script body into one string and asks whether the filename appears anywhere in it
      (`verify-gates-wired.mjs:64,67` — measured 2026-07-28), which counts
      `echo verify-foo.mjs` in an unrelated script as registration. One rule reads bodies in
      this PRD, and it is FR-3's.

   A candidate with no such registration fails, naming the file.
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/test/wiring.test.ts`
2. **FR-2 — Port the three missing surfaces, with their paths in config.** The script
   counts three surfaces `auditWiring` does not: the git-hooks directory, the bundle, and
   every `package.json` script body whose name does **not** match the verify prefix. Port
   all three.

   **The verify-prefix exclusion is load-bearing and must be ported exactly.** Without it,
   checks wire each other: a `verify:a` whose body invokes `verify:b` marks `verify:b`
   wired even when nothing invokes `verify:a`, and a bundle naming every member marks them
   all wired by existing. Use `config.verifyScriptPattern` for the exclusion so it stays
   consistent with the registered-to-wired selector.

   **Keep the CI reading at `run:` text.** That is a deliberate narrowing — a check named
   in a YAML comment is not wired — and it is the one place the package is already
   stricter than the script. It stays, stated rather than silently reconciled.

   **Because this is shipped package code, all three hardcoded paths become config.**
   Measured 2026-07-28, the script carries three repository literals: `.githooks`
   (`verify-gates-wired.mjs:36`), the bundle path (`:40`), and the verify scripts directory
   (`:60`). The hooks directory is this repository's choice, set by `package.json`'s
   `prepare` script; an adopter may use a different one, the git default, or none.

   **The three surfaces and the three keys are not the same three, and do not map one to
   one.** The surfaces are hooks, the bundle, and non-verify script bodies; the keys are
   `wiring.hooksDir`, `wiring.bundlePath`, and `wiring.scriptsDir`. Script bodies need no
   key — they come from `package.json`, which the audit already reads — and `scriptsDir`
   serves FR-1's on-disk direction rather than any surface.

   | Key | Type | Default | Meaning |
   | --- | ---- | ------- | ------- |
   | `wiring.scriptsDir` | `string` | `scripts/verify` | directory walked by FR-1's direction |
   | `wiring.hooksDir` | `string` | `.githooks` | git-hooks directory read as a surface |
   | `wiring.bundlePath` | `string` | `scripts/verify/verify-workflow.mjs` | bundle whose membership counts as a surface |

   All three are repo-relative. Semantic validation rejects an absolute path, a path
   escaping the repo root via a parent-directory segment, and a non-string. It does **not**
   require the paths to exist: absence is a legitimate configuration and is defined below
   as "not a surface", never an error.

   **Lexical validation is not containment, and the validator says so in place.** Its own
   comment records that a lexical check must be paired with a runtime resolver to catch a
   symlink escape (`validate.ts:454`). All three of these are **read** paths in shipped
   code, so each read resolves through a runtime containment check before it is opened, and
   a directory that resolves outside the repository is refused rather than read. One
   symlink-escape fixture per key.

   **The containment primitive already exists, is private, and is to be exported rather
   than copied.** `resolveContainedPaths` in `packages/provegate/src/core/config/load.ts`
   (declared at `load.ts:134`) is the function the memory and prompts path checks both use;
   measured 2026-07-28 it is **not** among that module's exports. Export it and call it —
   do not write a second containment check. Two implementations of one rule is
   `two-parsers-wrong-together`: the failure that actually happens is both being wrong the
   same way, which no comparison between them can see.

   **The other containment function is the wrong one, stated so it is not reached for.**
   `containedPath` (`run/init.ts:234`) is exported, but it is write-oriented: it throws with
   an `init refuses…` message, and it resolves the nearest existing **ancestor** of the
   target — it starts at `dirname(full)` and says so in its own comment
   (`init.ts:247-249`) — never the final component. That is correct for a path about
   to be created and wrong for a path about to be read, where the final component exists and
   may itself be the symlink that escapes.

   **Export scope is deliberately internal.** `packages/provegate/src/core/config/index.ts`
   re-exports a **named list** from `./load.js` rather than `export *`, so exporting
   `resolveContainedPaths` from `load.ts` and importing it in `wiring.ts` directly from
   `../config/load.js` leaves the package's public API unchanged. Do not add it to
   `config/index.ts`; nothing outside the package needs it, and FR-4's release note claims a
   config surface, not a new API.
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/src/core/config/types.ts`,
     `packages/provegate/src/core/config/defaults.ts`,
     `packages/provegate/src/core/config/validate.ts`,
     `packages/provegate/src/core/config/load.ts::resolveContainedPaths` (export only —
     the body is untouched),
     `packages/provegate/test/wiring.test.ts`,
     `packages/provegate/test/config-wiring.test.ts` (new)
3. **FR-3 — The matching rule, as a narrow closed grammar.** Adding surfaces without
   changing how they are read registers nothing, and specifying the reading loosely is no
   better. Both mistakes were made in PRD-023 and both were caught independently.

   **The resolution is narrowing, on the owner's direction of 2026-07-28.** Four consecutive
   independent rounds scored this grammar, and each found a defect one level deeper than the
   last: an enumerated list with no lexer, then a lexer with no segmentation, then
   segmentation and arity, then per-interpreter semantics inside the arity table. Every
   round's fix was correct and every round's fix opened the next level. That trajectory is
   `scope-out-the-layer-the-rounds-keep-hitting` — a scope error arriving as a run of design
   errors — so the answer is not a fifth deepening. **The flag-semantics machinery is
   removed rather than perfected**: the grammar below has no non-executing table, no arity
   table, and no per-interpreter knowledge, and what it loses is stated in both directions
   instead of being modelled.

   **Why any new machinery is needed at all.** `auditWiring`'s `wiredIn` is
   `wiredScripts.has(script)` (`wiring.ts:236`), and `wiredScripts` is built by running each
   command through `packageScriptOf` (`wiring.ts:229-235`), which returns null unless the
   first token is `pnpm`, `npm`, `yarn`, or `bun` (`wiring.ts:130-133`). It is a
   package-manager command resolver. The two new surfaces do not use that form at all: a
   hook body runs an interpreter against a **path**, and the bundle declares a **bare
   basename**. `NON_EXECUTING_FLAGS` and `VALUE_FLAGS` are not reused, because both are
   defined against package-manager grammar, not interpreter grammar — `--dir` and `--filter`
   mean nothing to `node`, and `--require` means nothing to `pnpm` — and, more to the point,
   **the rule below needs no flag table of its own**, so there is no second pair of tables to
   hold in step with them. The layer beneath them is not reusable either: `wiring.ts:231`
   segments every surface without tracking quotes, so the command boundaries the existing
   parser is handed would already be wrong for these surfaces.

   **(a) Derive the key.** For each registered script matching `verifyScriptPattern`, take
   the `.mjs` file its `package.json` body invokes, resolved under `wiring.scriptsDir`.
   That basename is the key the two new surfaces are matched against.

   **(b) Command surfaces — hooks and non-verify script bodies — are read by one scanner
   pass and one command shape.** Not a stack of layers: layered wording is what let the
   segmentation rule and the tokenizer rule disagree with each other on three boundary
   cases for two rounds. There is **one** left-to-right scan of the surface, and both the
   command boundaries and the tokens fall out of its state.

   **The scanner, defined by its state rather than by prose adjacency.** A surface is a
   whole hook file body or a whole `package.json` script body. It is scanned once, carrying
   exactly three pieces of state: inside a single-quoted run, inside a double-quoted run,
   and "the previous character was a backslash that has not yet been consumed". Three rules
   govern it, and each is stated as a fact about that state, because "preceded by a
   backslash" and "escaped" are not the same predicate and an earlier draft used the first
   to mean the second:

   1. A backslash **escapes the next character**, whatever it is — **except a newline**. A
      backslash does not escape a newline; line continuation is not part of this grammar.
   2. A **newline always cuts** a command boundary. Outside quotes, inside quotes, after a
      backslash: without exception.
   3. `;`, `&&`, and `||` cut a command boundary when, and only when, the scanner is
      **outside both quote states** and the separator's first character is **not escaped
      according to that state**.
   4. A `#` that **begins a token**, outside both quote states and unescaped, starts a
      comment that is discarded through to the next newline. It does not cut a boundary
      itself — the newline does. A `#` inside a token (`a#b`) is an ordinary character.

   Rule 4 is not decoration. A hook file is a shell script and carries `#` comments and a
   shebang, and without it a commented-out line such as `# build && node <path>` would be cut
   at the unquoted `&&` and the remainder read as a live invocation — a **false positive**,
   the one direction a meta-gate must not have. It is also the rule this document already
   states one surface over: a check named in a YAML comment is not wired (FR-2), and a check
   named in a shell comment is not wired for the same reason. The shebang needs no special
   case: `#!/bin/sh` begins with `#` and is discarded as a comment.

   Four consequences follow, each of which an independent round had to discover because an
   earlier wording left it derivable rather than stated:

   - **A quoted run cannot span a newline.** The newline cut is unconditional and a
     backslash cannot escape it, so a quote still open when a newline arrives is an
     **unterminated quote** — and an unterminated quote anywhere makes the **whole surface
     unparseable**. No wiring is declared from any part of it, no fragment is salvaged, and
     it is never a crash and never a substring fallback. There is no "initial quote state"
     question for a fragment, because a fragment never inherits one.
   - **`\\;` cuts.** The first backslash escapes the second; the second is consumed as an
     ordinary character; the `;` that follows is unescaped by scanner state, so rule 3
     applies. The command after it is read normally.
   - **A backslash immediately before a newline cuts too**, and the backslash is an ordinary
     character in the command before the cut. An invocation split across a continued line —
     `node \` then the path on the next line — therefore declares no wiring: neither
     fragment is an interpreter followed by a path.
   - **The backslash rule is uniform across quote states**, which is a deliberate
     simplification: a real shell treats a backslash inside a **single**-quoted run as a
     literal character. The divergence is confined to surfaces that put a backslash inside
     single quotes, where the two readings can disagree about where the quoted run ends —
     and when they do, the scanner's answer is the scanner's state. If that leaves a quote
     open, the surface is unparseable and declares no wiring, which is the fail-closed
     direction. One uniform rule that is occasionally stricter beats two rules that have to
     agree with each other; two rules that had to agree with each other is what this round
     removed.

   **This deliberately diverges from production, and the divergence is about the surfaces
   this PRD adds, not about a bug production has today.** `auditWiring` currently splits
   every surface with `text.split(/[\n;]|&&|\|\|/)` (`wiring.ts:231`, measured 2026-07-28),
   which is quote-blind — but today it reads only manifest commands and CI `run:` text
   (`wiring.ts:214-223`), and no hook or script body ever reaches it, so the quote-blindness
   costs nothing measurable right now. The cost arrives **with FR-2's surfaces**, and it
   would be a **false negative on a real wiring**, which for a meta-gate is the expensive
   direction: a hook line `node scripts/verify/verify-foo.mjs --message "build && deploy"`
   would be cut at the quoted `&&`, the first fragment would carry an unterminated quote,
   and a genuinely wired check would report as wired nowhere — teaching the repository to
   add an exception for a check that was wired all along. The scanner reads that line as one
   command and wires it. So the requirement is not "fix production"; it is **"do not carry
   production's segmentation into a surface where it would start being wrong"**. In the
   other direction the two rules agree by different routes:
   `echo "run node verify-foo.mjs; done"` yields unparseable fragments under production's
   split and a single `echo` command under the scanner, and neither wires anything.

   **One separator residual, stated rather than discovered.** The scanner cuts at `;`, `&&`,
   and `||` only — not at a single `|` or `&` — which matches the separator set production
   already uses. A command reachable only through a pipe or a background operator is
   therefore not cut out and declares no wiring. That is the fail-closed direction, and
   widening the set is a code change with a test, like every other widening here.

   **The command shape is the narrowing: no flag semantics at all.** Each command the
   scanner cuts out is already split into tokens by the same pass — tokens break on unquoted
   whitespace, a single- or double-quoted run is **one token** with its quotes stripped, and
   an escaped character is literal. No variable expansion, no globbing, no command
   substitution. A command is then read in exactly this order, and it wires a script **if
   and only if** every step succeeds:

   1. **Strip wrappers.** Discard leading `NAME=value` assignments, and a leading `env`
      together with any of its own `NAME=value` arguments. An `env` carrying anything else —
      `env -i node <path>`, `env -u VAR node <path>` — leaves a head token that is not an
      interpreter, so the command declares no wiring. There is no `env` option table either,
      and for the same reason there is no flag table.
   2. **Head token.** It must be one of exactly `node`, `bun`, `deno`, `tsx`, `ts-node`,
      compared after stripping any directory prefix so `/usr/bin/node` counts. Anything
      else — `echo`, `cat`, `printf`, a package manager, a comment marker — is not an
      interpreter invocation and declares no wiring.
   3. **`deno`'s one subcommand.** If the head is `deno`, one optional literal `run` may
      follow it. `deno run <path>` is deno's documented execution form and `deno <path>` is
      accepted as well, so **both wire**. `run` is matched as that literal and nothing else:
      no other subcommand is accepted, and a subcommand is never inferred from a token's
      shape.
   4. **The path is the immediately next token.** Bare or quoted (the quotes are already
      stripped), and it **must not start with `-`**. Wiring is decided by basename equality
      against the key derived in (a).
   5. **Everything after the path is a script argument** and is irrelevant. It is never read
      as a path, and a basename appearing there never counts.

   **Any `-`-leading token standing between the head token (or `deno`'s `run`) and the path
   means the command declares no wiring.** Not "the flag is skipped", not "the flag consumes
   a value" — the command is refused, fail-closed. That single rule replaces both flag
   tables an earlier draft carried, and it is why these all resolve identically and for the
   same reason:

   | Command | Verdict | Why |
   | ------- | ------- | --- |
   | `node --check scripts/verify/verify-foo.mjs` | no wiring | a dash token precedes the path |
   | `node -e "import('./scripts/verify/verify-foo.mjs')"` | no wiring | a dash token precedes the path |
   | `node --require verify-foo.mjs app.mjs` | no wiring | a dash token precedes the path |
   | `node --enable-source-maps scripts/verify/verify-foo.mjs` | no wiring | a dash token precedes the path |

   No table has to know which of those consumes a value, which interpreter spells it which
   way, or whether `-c` means node's `--check` or deno's `--config`. The question that four
   rounds kept reopening is not answered better here — **it is not asked**.

   **The residual, stated in both directions, because narrowing has a cost and hiding it
   would be the same defect in a stricter costume.**

   *False negatives are real, and they are the cheap direction.* The fourth row above is a
   legitimate invocation that really does execute the script, and this rule refuses it. Two
   remedies exist and both are ordinary: drop the flag from the invocation, or add a
   `manifest.wiringExceptions` entry with its justification, which is the shrink-only store
   the audit already reads. Neither is silent. This is a **meta-gate**: a false negative
   surfaces as `gate script "…" is wired nowhere — wire it, delete it, or add a justified
   wiringExceptions entry` (`wiring.ts:245-247`), which a maintainer must act on. It can
   never surface as a silent pass. A false positive would. (The message's parenthetical
   names the surfaces it searched and is elided here; FR-2 adds three more to it.)

   *No false-positive form survives that the deleted tables were defending against.* Each of
   them — the syntax check (`--check`), the eval payload (`-e`, `--eval`), the print form
   (`-p`, `--print`), the preload (`--require`, `--import`, `--loader`, `--preload`) — puts a
   dash token before the path, so every one is refused by the single rule rather than by a
   table entry. The old "basename sitting in an option value" case needs no rule of its own
   either: a basename can only be an option value if an option preceded it, and that option
   is a dash token before the path. **The shapes that remain accepted are exactly the ones
   the port exists to recognize**: an interpreter and a path, optionally quoted, optionally
   behind an environment wrapper, optionally with `deno run`.

   *The subcommand exception is granted once, to one head, and the cost is named.* `deno`
   gets it because both `deno run <path>` and `deno <path>` are ordinary ways to write the
   same execution. `bun` does not, even though `bun run <path>` also runs a file: under this
   rule that form reads `run` as the path, matches nothing, and is a **false negative** with
   the same two remedies as any other. Granting the exception to a second head is a code
   change with a test, exactly like adding an interpreter — the point of a closed rule is
   that widening it is visible, not that the first draft guessed every form.

   *One residual runs the other way, and it is named rather than left to be found.* Because
   a backslash does not escape a newline, a continued `echo` whose continuation line begins
   with an interpreter and a path is read as two commands, and the second one wires — where
   a real shell would have read one `echo`. The alternative is honoring line continuation,
   which is precisely the state that lets a quoted run span a newline; that boundary case
   took two rounds to surface, and reintroducing it to serve a shape no hook is written in
   is a bad trade. The simpler scanner wins, and this sentence is the disclosure.

   **The interpreter list stays closed and in source, and it is now the only list here.** Not
   config: an adopter silently widening their own gate is the failure this PRD is about, and
   adding an interpreter should cost a code change and a test. The absence of a flag table
   beside it is a **requirement**, not an omission — see §12.

   Note the consequence, stated rather than discovered:
   `node "scripts/verify/verify-foo.mjs"` **does** wire, because the scanner strips the
   quotes and the unquoted result is the immediately next token after the head.

   **(c) The bundle is data, not a command — read its membership under a line-anchored and
   column-anchored grammar.** "Parse structurally" is not a specification, and neither is
   "top-level": the real bundle carries imports, constants, functions, strings and template
   literals around its list (`verify-workflow.mjs:1-87`), and *top-level* is a fact about a
   JavaScript parse tree, which a zero-dependency scanner does not have. So the grammar is
   anchored on lines and columns, which such a scanner does have.

   **The declaration.** A membership declaration **opens** at a line whose **first
   character** — column zero, no leading whitespace of any kind — begins exactly
   `const CHECKS = [`. It **closes** at the first subsequent line whose first non-whitespace
   characters are `];`.

   **The body.** Every line between those two anchors must be exactly one of three shapes:

   1. a **single string-literal element**: one single- or double-quoted string containing
      **no backslash and no occurrence of its own delimiting quote**, with an optional
      trailing comma and, after that comma, an optional `//` comment. Any indentation;
   2. a **whole-line `//` comment**, any indentation;
   3. a **blank line**.

   Anything else on any line between the anchors — a computed expression, a spread, an
   identifier, a nested array, a template literal, two literals on one line, a literal
   carrying an escape — makes the **declaration** unparseable, and the bundle declares **no**
   membership. Not that line skipped: the whole declaration. A scanner that guesses at one
   line's escaping has already stopped agreeing with the JavaScript engine that runs the
   file, and half an escape rule is `narrow-the-grammar-not-the-parser` inverted — widening
   the parser instead of narrowing what is read. A member is a filename; a filename needing
   an escape is not a case this grammar serves.

   **Ambiguity.** If **more than one line in the file opens a declaration** — anywhere, at
   any point, including inside what a JavaScript parser would call a string, a template
   literal, a comment, or a nested block — the file is ambiguous and declares **no**
   membership. Not first-wins, not last-wins, not the union: guessing produces a membership
   set no reader of the file would predict, and ambiguous is treated exactly as unparseable
   — fail closed, no membership, no error.

   **The impostor consequence, stated honestly.** A column-zero `const CHECKS = [` inside a
   template literal is indistinguishable from the real thing to a line scanner. Under this
   grammar it cannot **forge** a membership list; it makes the file ambiguous, so the surface
   **disappears**. That is the fail-closed direction — the worst an impostor achieves is
   removing a surface, never adding a member — **and the loss is visible**, because the audit
   reports how many surfaces it actually read. That reporting requirement is stated in this
   FR and required of the implementation; it is what turns a silently-lost surface into a
   number a maintainer can watch change.

   **Measured against the one real bundle, 2026-07-28.**
   `scripts/verify/verify-workflow.mjs` satisfies this grammar **without modification**:
   `const CHECKS = [` sits at column zero on line 15, its ten members are single-quoted
   single-line literals with trailing commas and no escapes (`:16-25`), and the closing `];`
   is at column zero on line 26. It is the file's **only** line that opens a declaration —
   the two other `CHECKS` mentions are a membership test (`:53`) and a loop header (`:64`),
   neither of which begins a line with `const CHECKS = [`. The grammar was written against
   the corpus, not the corpus edited to fit the grammar: `narrow-the-grammar-not-the-parser`
   requires measuring the existing corpus before narrowing, and the anchors above are the
   result of that measurement. **Do not edit the bundle to satisfy this rule** — if a future
   bundle stops satisfying it, that is a change to this grammar with a test, made
   deliberately.

   Do not grep the body: a bundle is a list of members that happens to live in a script, and
   substring-matching its text is reading the wrong thing —
   `narrow-the-grammar-not-the-parser`. A bundle path that does not exist, or whose contents
   declare no parseable member list, is **not a surface** — the same rule as an absent hooks
   directory. Absence, unparseability and ambiguity are all "no membership declared", never
   an error, and never a fallback to text search.

   **The narrowness is the point and it has a cost.** A repository that renames its bundle
   array, indents its declaration, or writes it inside a function loses the surface. That is
   the correct trade against the alternative, which is the substring matching this PRD exists
   to remove — but it must be visible in the audit's output, which is why the surface count
   is a requirement rather than a nicety.

   **The deny matrix is part of the requirement, not an afterthought.** Every row below
   must leave the check unwired, every row has a fixture, and **every row is paired with a
   positive control on the same shape** — a deny fixture whose input would fail anyway is
   not evidence (`assert-absent-needs-an-independent-cause`). The pairing is what makes the
   left column mean "this rule rejected it" rather than "something rejected it".

   | Rule | Does **not** wire | Paired positive control, same shape |
   | ---- | ----------------- | ----------------------------------- |
   | scanner — quoted separator | a hook body whose only `&&` sits inside a quoted run, so the quoted text never becomes its own command | the same hook with the `&&` unquoted, chaining a real interpreter-plus-path invocation |
   | scanner — escaped separator | `echo done\; node scripts/verify/verify-foo.mjs` — the `;` is escaped by scanner state, nothing cuts, and the whole line is one `echo` command | `echo done\\; node scripts/verify/verify-foo.mjs` — the first backslash escapes the second, so the `;` is unescaped, the cut happens, and the invocation **wires** |
   | scanner — quote across a newline | a surface whose quoted run is still open when a newline arrives: unterminated, so **no** part of the surface declares wiring — including a valid invocation on a later line | the same surface with the quoted run closed before its newline; the later invocation wires |
   | scanner — backslash-newline | an invocation split across a continued line (`node \` and the path on the next line): the newline cuts regardless of the backslash, and neither fragment is an interpreter followed by a path | the same two tokens on one line — `node scripts/verify/verify-foo.mjs` **wires** |
   | scanner — shell comment | a hook line `# build && node scripts/verify/verify-foo.mjs` — the comment is discarded through the newline, so the `&&` never cuts and no invocation exists | the same line with the leading `#` removed — the `&&` cuts and the invocation after it **wires** |
   | head token | a non-verify script body that echoes the basename | the same body with `node` in the head position |
   | dash before the path — syntax check | `node --check scripts/verify/verify-foo.mjs` | `node scripts/verify/verify-foo.mjs` — no dash token between head and path, **wires** |
   | dash before the path — eval | `node -e "import('./scripts/verify/verify-foo.mjs')"` | the same file as the path token: `node scripts/verify/verify-foo.mjs` |
   | dash before the path — preload | `node --require verify-foo.mjs app.mjs`. The old "basename consumed as an option value" case is **subsumed** here: a basename can only be an option's value if an option preceded it, and that option is a dash token before the path — so it needs no rule and no row of its own | `node scripts/verify/verify-foo.mjs`, and separately `node --require ./setup.mjs scripts/verify/verify-foo.mjs` **also does not wire** — the same verdict as the deny cell, by the same rule, which is the point of removing the arity table |
   | after the path | `node app.mjs "verify-foo.mjs"` — every token after the path is a script argument | `node "scripts/verify/verify-foo.mjs"` — quoted **path**, **wires**, because the scanner strips the quotes |
   | deno subcommand | `deno check scripts/verify/verify-foo.mjs` — only the literal `run` may follow `deno`, so `check` is read as the path and its basename matches nothing | both `deno run scripts/verify/verify-foo.mjs` and `deno scripts/verify/verify-foo.mjs` **wire** |
   | the exception is deno's alone | `bun run scripts/verify/verify-foo.mjs` — no other head takes a subcommand, so `run` is read as the path and matches nothing | `bun scripts/verify/verify-foo.mjs` — **wires**; the false negative on bun's `run` form is stated in FR-3(b) |
   | wrapper | `env NODE_ENV=test echo scripts/verify/verify-foo.mjs` — the wrapper strips and the head is then `echo` | `env NODE_ENV=test node scripts/verify/verify-foo.mjs` — **wires** |
   | bundle — column anchor | the file's only `const CHECKS = [` indented by one space: no line opens a declaration, so there is no membership | the same declaration at column zero — the member **wires** |
   | bundle — impostor | a second `const CHECKS = [` at column zero **inside a template literal**: two opening lines, ambiguous, no membership from either | the same file with the impostor line indented by one space — the real declaration is read and its members wire |
   | bundle — escape | a member literal containing a backslash, and separately one containing its own delimiting quote | the same members written plainly |
   | bundle — duplicate | two column-zero declarations in ordinary code | the same members under one declaration |
   | FR-2 | the basename inside a YAML comment | the same text in `run:` position |
   | FR-2 | the basename inside a verify-prefixed script body (the FR-2 exclusion) | the same body under a non-verify script name |

   The preload row carries a second deny beside its control, and that is deliberate: under
   the old arity table `node --require ./setup.mjs <path>` wired, and under the narrowed rule
   it does not. A fixture asserting the old verdict would be asserting the deleted table, so
   the row states the new one explicitly rather than leaving the reversal to be discovered in
   Phase 5. The row's independent cause is still its positive control — the identical path
   with no dash token, which wires — so the pairing proves the dash rule fired rather than
   something else.

   Two positives stand on their own rather than as another row's control, because they are
   the shapes the whole port exists to recognize: a plain interpreter-plus-path invocation in
   a git hook, and the bare basename in the bundle's declared member list — each wiring a
   check that nothing else names.
   - **Targets:** `packages/provegate/src/core/gates/wiring.ts::auditWiring`,
     `packages/provegate/test/wiring.test.ts`
4. **FR-4 — Ship it as a release, because the config surface is public.** Three new config
   keys under `wiring` are an adopter-visible surface even though no command or flag
   changes. Add a changeset declaring a **minor** bump whose note names the three keys with
   their defaults and states that the wiring audit now recognizes hook, bundle, and
   sibling-script surfaces — an adopter whose check was "wired nowhere" may find it wired
   after upgrading, and that is a verdict change worth announcing.

   Evidence is one semantic assertion over a single entry, not independent greps, which are
   satisfied by two different files.

   **`test/changeset-entry.test.ts` already exists — PRD-021 shipped it on 2026-07-27, and
   this FR extends it rather than creating it.** The file's own header records why it is
   semantic: two recursive greps pass on a checkout carrying an unrelated minor changeset
   plus an unrelated note, and `pnpm changeset status` exits 0 on a checkout with no
   changesets at all.

   **Adding a second entry collides with how that file selects its subject, and the
   collision must be handled in this FR rather than found in Phase 5.** Measured
   2026-07-28: three of its five assertions select their entry with
   `entries().find((e) => e.bumps.get('provegate') === 'minor' && COMPAT.test(e.body))`,
   where `COMPAT` matches `upgrade the CLI first`. That predicate is not a discriminator —
   it describes **any** new-config-key release note, including the one this FR owes, since
   an older CLI rejects an unknown `wiring` block exactly as it rejects `valueScoring`
   (`validate.ts:193`). With two qualifying entries, `find` returns whichever `readdirSync`
   yields first, and two PRD-021 assertions — the `weights` merge rule and
   `presence-triggered` — are false of this PRD's note. The suite would go red on filename
   order. `.changeset/` today holds `lucky-pugs-argue.md` (PRD-021's entry, qualifying) and
   `memory-adoption-cli.md` (minor, but carrying no compatibility sentence, so not
   qualifying today).

   So: give **each** assertion group a discriminator unique to its own entry — the
   `valueScoring` block for PRD-021's, the three `wiring.` key names for this one — and
   change nothing about what either group requires. This is a **selection** change, not a
   strictness change: every existing expectation keeps its exact text, which is the line
   `strictness-added-during-extraction-is-a-behavior-change` draws. The alternative, writing
   this PRD's note so it fails to match `COMPAT`, is worse — it would mean omitting the
   compatibility instruction the note actually owes an adopter.
   - **Targets:** `.changeset/` (new entry),
     `packages/provegate/test/changeset-entry.test.ts` (exists — extended, not created)

---

## 5. Non-Goals (Out of Scope)

- **Deleting anything.** No root script, no packed twin, no installer map entry, no
  exceptions file. All of it is PRD-026, in one commit, because the pack-drift check pairs
  the two sides. This PRD only makes those deletions safe.
- **The exceptions-store consolidation.** `manifest.wiringExceptions` is already what
  `auditWiring` reads and it already carries the justification the shrink-only policy
  depends on, so nothing is needed here. Removing the redundant root exceptions file
  belongs with the script it serves, in PRD-026, along with the adopter conversion rule for
  the packed copy.
- **The class ledger and its comparison against the decision record.** Owner decision of
  2026-07-27: the ledger governs this repository's scripts directory, which the decision
  record's own test makes repo-class, so it ships as a repo script in PRD-026 alongside the
  deletions whose rows it must lose. Keeping it here put a repository-local artifact into
  code that `gate check --wiring` runs for **every adopter**, where the `method` class is
  structurally unreachable — an adopter cannot move a check into `packages/provegate`.
- **Porting the deferral-policy check into the package.** It is a real gap — an adopter
  gets no deferral-policy enforcement — but it is new behavior, not audit completion.
  PRD-026's ledger carries it as pending so it cannot be forgotten.
- **Reclassifying or relocating any `repo`-class script.** The turbo-inputs, test-task
  coverage, dependency-audit, pack-drift, egress, and doc-claims checks all stay where they
  are.
- **Modelling interpreter flag semantics, and making the interpreter list configurable.**
  The narrowed shape refuses any command whose script path is preceded by a `-`-leading
  token, so there is no non-executing table and no arity table — nothing to configure,
  extend, or keep in step with five interpreters' spellings. The interpreter list itself
  stays a closed source constant for the reason it always was: a config knob that lets a
  repository widen its own gate is the failure mode the meta-gate exists to prevent.
  Extension is a code change with a test.
- **The readiness lint parsers (PRD-024) and the sweep flags, deletions, pack migration, or
  CI changes (PRD-026).**

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a verify script on disk that is not registered in `package.json`, **When** the
  audit runs, **Then** it fails.
- **Given** a check wired only through a hook that invokes an interpreter against the
  script's path, **When** the audit runs, **Then** it is wired.
- **Given** the same invocation behind an environment wrapper, **Then** it is wired —
  wrappers are stripped before the head token is read.
- **Given** `deno run` against the script's path, and separately `deno` against the same
  path with no subcommand, **Then** both are wired — `run` is deno's documented execution
  form and is accepted as an optional literal — and **Given** any other deno subcommand,
  **Then** it is not, because that token is read as the path and its basename matches
  nothing. **Given** `bun run` against the same path, **Then** it is not wired either: the
  subcommand exception is deno's alone, and that false negative is stated rather than
  silently widened.
- **Given** a check named only by its bare basename in the bundle's declared member list,
  **Then** it is wired.
- **Given** a check named only in a non-verify script body as the argument of an echo,
  **Then** it is **not** wired.
- **Given** an interpreter invocation with **any** `-`-leading token between the interpreter
  and the script path — a syntax check, an eval string, a preload, or a harmless flag such
  as `--enable-source-maps` — **Then** it is **not** wired, uniformly and for one reason.
  The false negative on the harmless flag is deliberate: the remedy is dropping the flag or
  adding a justified `manifest.wiringExceptions` entry, and the audit reports it rather than
  passing silently.
- **Given** a hook that invokes an interpreter against the script's path written **in
  quotes**, **Then** it **is** wired — the scanner strips quotes and the path is the
  immediately next token. This is the case the grammar went out of its way to state; it is
  affirmed here so no section of this document can be read the other way.
- **Given** the basename in any token **after** the script path, **Then** it does not wire —
  everything after the path is a script argument.
- **Given** a hook body whose only `&&` sits inside a quoted run, **Then** the quoted text
  is not read as a separate command, and **Given** the same body with the `&&` unquoted,
  **Then** the command after it is read and wires.
- **Given** a separator written `\;`, **Then** it does not cut, and **Given** the same
  separator written `\\;`, **Then** it does cut and the command after it is read — the
  scanner's escape state decides, not adjacency to a backslash.
- **Given** a hook line whose invocation sits inside a `#` comment, **Then** it is not wired,
  even when a separator inside the comment would otherwise have cut a live command out of
  it, and **Given** the same line uncommented, **Then** it is wired. A check named in a
  shell comment is not wired, for the same reason one named in a YAML comment is not.
- **Given** a surface whose quoted run is still open when a newline arrives, **Then** the
  quote is unterminated, no part of the surface declares wiring, and the audit completes
  rather than failing.
- **Given** an invocation split across a backslash-continued line, **Then** it is not wired —
  the newline cuts unconditionally and neither fragment is an interpreter followed by a
  path.
- **Given** a bundle whose member literal carries a backslash or its own delimiting quote,
  separately a bundle whose only declaration is indented, separately a bundle with a second
  column-zero declaration inside a template literal, and separately a bundle with two
  column-zero declarations, **Then** none of them declares any membership, and none is an
  error.
- **Given** a check named only inside a YAML comment in a CI workflow, **Then** it is not
  wired — the package reads `run:` text and that narrowing is deliberate.
- **Given** a verify-prefixed script body that names another verify script, **Then** that
  other script is not thereby wired.
- **Given** a configured hooks directory that does not exist, and separately a bundle path
  whose contents declare no parseable member list, **Then** the audit completes with those
  surfaces simply absent, not an error.
- **Given** a configured hooks directory that is absolute or escapes the repo root,
  **When** config resolves, **Then** it fails with a named issue.
- **Given** a configured hooks directory that resolves outside the repository through a
  symlink, **When** the audit reads it, **Then** it refuses. Lexical validation alone is
  not containment — the validator says so in place.

---

## 7. Technical Considerations

### Architecture

- **Complete before delete.** Every capability the deleted script provides must exist in
  the package before PRD-026 removes it. This PRD is that ordering constraint expressed as
  a work item.
- **Surfaces and predicates are two things.** PRD-023 ported a surface set without the
  predicate that reads it, then specified the predicate too loosely to falsify. FR-3 is
  written as a closed grammar with a deny matrix for that reason: an implementer should
  have no freedom left about what counts.
- **A narrow grammar beats a complete one, and that is a scope decision rather than a
  wording one.** Four consecutive independent rounds each found the next defect one level
  deeper inside the command grammar while measuring everything around it exact — the
  measured signature of `scope-out-the-layer-the-rounds-keep-hitting`. On the owner's
  direction of 2026-07-28 the layer is removed rather than repaired: no flag tables, no
  per-interpreter semantics, one dash-token rule, and the residual disclosed in both
  directions. A promise not made is not a gap.
- **Kind decides the rule.** Hooks and script bodies are commands and get one scanner pass
  and one shape test. The bundle is data and gets its member list read off lines and
  columns. One rule for both is what produced the echo-counts-as-wiring defect.
- **The ledger is the durable part, and it lives next door.** The audit fixes today's
  gaps; the ledger is what makes tomorrow's duplicate fail. It is in PRD-026 because the
  decision record's own test classes it repo, and because the PRD that deletes the scripts
  is the one that must drop their rows — one owner, one commit, no cross-PRD transition.

### Dependencies

- **No decision-record precondition.** It moved to PRD-026 with the ledger it governs, so
  this PRD can start without it.
- **PRD-024** — no ordering constraint either way; the two touch disjoint files.
- **PRD-026 depends on this**, not the reverse. Its deletions are unsafe until the audit
  here is green, and its ledger has nothing to classify until this lands.
- **PRD-021 closed on 2026-07-27** (`_prds/completed/prd-021-governance-truth-up.md`), so
  the config-file and changeset-directory contention it held is gone and
  `test/changeset-entry.test.ts` now exists on `main` — FR-4 extends it. `gate queue` run
  2026-07-28 reports zero READY, zero IN-FLIGHT and zero IN-REVIEW items, so no active
  execution-phase claim overlaps this surface today. PRD-026 declares `.changeset/` and the
  changeset-entry test as well, and it depends on this PRD, so it runs after. Re-run
  `gate queue` before claiming rather than trusting this paragraph — three overlap counts
  went stale inside a day during the PRD-023 wave, and this one has already gone stale once.
- No new runtime dependencies; `packages/provegate` stays at zero.

### Rollback

This PRD ships three things, and the rollback covers exactly those three.

The audit changes are additive: revert `auditWiring`'s new direction, surfaces, and
matching rule, and the audit returns to today's behavior. Remove the three `wiring` config
keys from the types, defaults, and validation modules; because no other code reads them,
nothing else changes. Delete the changeset entry, or if it has already been released,
follow it with a patch changeset stating the keys are no longer read.

The `resolveContainedPaths` export in `load.ts` may stay or go. It is internal — the
function is unchanged and `config/index.ts` does not re-export it — so reverting it is
housekeeping rather than a rollback step, and leaving it costs nothing.

**A post-release rollback may not simply delete the config keys.** `validateConfig` rejects
every unknown key (`validate.ts:193`), so an adopter who set `wiring.hooksDir` and then
upgraded to a reverted version could no longer load their configuration at all — a worse
outcome than the audit
gap the rollback is undoing. A revert after release must either keep accepting the `wiring`
block as deprecated-and-ignored, or ship the key removal as a stated migration step. Before
release, deleting the keys outright is safe because nothing has consumed them.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/gates/wiring.ts::auditWiring` — direction, surfaces,
      matching grammar
- [ ] `packages/provegate/src/core/config/types.ts`, `defaults.ts`, `validate.ts` — the
      `wiring` keys
- [ ] `packages/provegate/src/core/config/load.ts` — export `resolveContainedPaths`; the
      function body is not touched
- [ ] `packages/provegate/test/wiring.test.ts` — fixtures including the full deny matrix
- [ ] `packages/provegate/test/config-wiring.test.ts` (new) — defaults and path validation
- [ ] `packages/provegate/test/changeset-entry.test.ts` — extend with this PRD's entry, and
      re-anchor the existing assertions to theirs (FR-4)
- [ ] `.changeset/` entry (minor)

---

## 9. Open Questions

- (none) — the interpreter grammar and the config keys are specified here; the class ledger
  and its decision record moved to PRD-026 by owner decision of 2026-07-27.

<!-- BULLET LIST, deliberately: PRD-024's FR-2 makes a paragraph-form section a lint
failure. -->

---

## 10. References

- `_brain/learnings/gate-wire-or-delete.md` — the meta-gate this PRD completes
- `_brain/learnings/narrow-the-grammar-not-the-parser.md` — governs FR-3(c)
- `_brain/learnings/two-parsers-wrong-together.md` — governs FR-2's containment seam
- `_brain/learnings/a-rule-corrected-survives-where-it-is-restated.md` — the sweep
  discipline four of this document's iterations have needed
- `_brain/learnings/scope-out-the-layer-the-rounds-keep-hitting.md` — the trajectory that
  produced the 2026-07-28 narrowing, and the reason it is a scope decision rather than a
  fifth wording round
- `_readiness/wip/readiness-023-gate-self-hosting.md` sections 8 and 9 — where the matching
  rule was found missing, then found underspecified
- PRD-023 sections 4 and 7 — the requirements this PRD carries forward

---

## Memory Inputs

- applied: `gate-wire-or-delete` — this PRD is that record's mechanism: every registered
  check wired to an executing surface, every on-disk check registered. FR-1 and FR-2 close
  the two halves the package could not see.
- applied: `narrow-the-grammar-not-the-parser` — twice, and the second application is the
  2026-07-28 narrowing itself. FR-3(c) reads the bundle's declared member list instead of
  grepping its body, under a grammar measured against the one real bundle before it was
  written (`verify-workflow.mjs:15-26`) exactly as this record requires. FR-3(b) then
  applies the same move to **commands**: rather than teaching the reader more interpreter
  flag semantics — the direction four consecutive rounds each found one level deeper — the
  accepted command shape is narrowed until no flag table is needed at all, and the ambiguous
  shape is refused rather than interpreted. "An approximation of a specification is wrong in
  a direction nobody can predict" is precisely what a global arity table applied to five
  interpreters was.
- applied: `scope-out-the-layer-the-rounds-keep-hitting` — this record names the measured
  trajectory here: iterations 1-4 (6.28, 7.00, 7.23, 7.08) put every blocking finding in the
  command grammar while measuring the surrounding FRs exact and calling them closed. Per the
  record, the question asked was what this PRD could stop promising rather than which
  counterexample to answer next; the owner's direction of 2026-07-28 removed the
  flag-semantics layer. Recorded as applied rather than reviewed because it changed the
  document's scope, not only its wording.
- applied: `assert-absent-needs-an-independent-cause` — FR-3's deny matrix is the risk
  here: a "does not wire" assertion passes trivially if the fixture would have failed
  anyway. Every deny case is paired with a positive control on the same shape.
- applied: `strictness-added-during-extraction-is-a-behavior-change` — porting the script's
  surfaces into shared package code is exactly this record's shape. The CI narrowing and
  the echo rejection are deliberate strictness, stated in FR-2 and FR-3; if an existing
  test must be edited to pass, the port changed behavior — revert rather than adjust the
  test.
- applied: `two-parsers-wrong-together` — FR-2's runtime containment exports the existing
  `resolveContainedPaths` from `config/load.ts` instead of writing a second check, and §12
  forbids the copy by name. A second implementation is exactly this record's failure: two
  parsers wrong the same way, which no comparison between them can see.
- applied: `a-rule-corrected-survives-where-it-is-restated` — this document's most-repeated
  defect: four separate times a correct fix left the old rule standing where it was
  restated. The 2026-07-28 narrowing is the largest such risk yet, because it deletes
  machinery rather than adjusting it, so every removed term — arity, `--require`,
  `--tsconfig`, `-c`, non-executing, `VALUE_FLAGS`, "layer" — was grepped across the whole
  document afterwards and rewritten at every normative site: Success Metrics, Primary Goals,
  User Stories, §5, §6, §7, the §11 FR-3 row, and §12. The deleted tables survive only as
  Changelog history, which is the one place a superseded rule belongs.
- reviewed: `fixture-must-reach-production-shape` — the wiring fixtures call `auditWiring`
  with the config and manifest its real callers pass, not hand-built arguments.
- not-applicable: `free-text-field-is-the-unread-drift-ledger` — its watch fires because
  the closing diff refreshes the generated `_state/prds.json`; this PRD adds no
  documentation-only rule and no free-text field, and the state change is the builder
  recording scores and statuses. (Appended at close, when the watch fired on the merge
  diff.)
- reviewed: `state-model-before-mechanism` — its watch fires on this PRD's own file in
  the closing diff (status-header advances). Its subject — a flat trajectory means cut
  scope or write the state model — is what produced the 2026-07-28 narrowing, and that
  application is already carried by `scope-out-the-layer-the-rounds-keep-hitting` above.
  (Appended at close.)
- reviewed: `score-band-prescribes-the-action` — its watch names this PRD's readiness
  artifact, which the closing diff touches only by ARCHIVING it (wip → completed). The
  record's rule was honored across this item's five scoring rounds: the 7-point band's
  iterate action ran four times and the structural exit came from its sibling record,
  not from ignoring the band. (Appended at close, when the archive rename fired the
  watch.)
- applied: `surface-set-without-its-predicate` — this PRD's own declared Memory Output,
  whose watch covers `gates/wiring.ts` and therefore fires on the very diff that creates
  it. Applied by construction: the two halves it names are FR-1/FR-3's surfaces and
  predicate, and the deny/control pairing it prescribes ships here. (Appended at close —
  a record born in a diff watches that diff, which is the contract working, not drift.)

---

## Memory Outputs

- learning: `_brain/learnings/surface-set-without-its-predicate.md` — that porting the
  inputs of a check without the predicate that reads them registers nothing, and that
  replacing an unsafe predicate with an open-ended one is the same defect wearing a
  stricter costume. Measured twice in one wave, on the same function.

---

## Conflict Surface

Resource paths (globs) this PRD claims **exclusive write ownership** of. The lock
lease mirrors these as `ownedPaths`; the path-conflict gate fails when two active
execution-phase claims overlap. If nothing is claimed, write `- none`.

> **Rule:** never declare shared append-only manifests here (lockfiles, package
> manifests, agent entry docs) — they are excluded from overlap by
> `workflow.config.json` `sharedAppendOnly`.

- `packages/provegate/src/core/gates/wiring.ts`
- `packages/provegate/src/core/config/types.ts`
- `packages/provegate/src/core/config/defaults.ts`
- `packages/provegate/src/core/config/validate.ts`
- `packages/provegate/src/core/config/load.ts`
- `packages/provegate/test/wiring.test.ts`
- `packages/provegate/test/config-wiring.test.ts`
- `packages/provegate/test/changeset-entry.test.ts`
- `_brain/learnings/surface-set-without-its-predicate.md`
- `.changeset/`

**Uncontested, measured with `gate queue` on 2026-07-28:** zero READY, zero IN-FLIGHT and
zero IN-REVIEW items, so nothing holds an active execution-phase claim on this surface.
PRD-021 — which previously held the three config files and the changeset directory — closed
2026-07-27. `packages/provegate/src/core/config/load.ts` is claimed by no other `wip` PRD
(grepped 2026-07-28). The only remaining declared overlap is PRD-026, which names
`.changeset/` and `packages/provegate/test/changeset-entry.test.ts` and depends on this PRD,
so it runs after. Re-run `gate queue` before claiming: this paragraph has already been
overtaken once.

---

## Durable Artifacts

Where this PRD's durable knowledge lands (Phase 7's gate checks every non-`none` path
against the merge diff). Never leave empty — write `none` explicitly. Narrow scope:
only **this PRD's** durable knowledge.

- Review artifact: `_docs/reviews/review-025-wiring-audit-completion.md`
- Learning: `_brain/learnings/surface-set-without-its-predicate.md` — the Memory Output
  above, repeated here because the two lists are one contract
- Decision: `none` — the governing decision record is PRD-026's precondition, not this
  PRD's output; nothing here takes a new architectural decision

---

## 11. Verification Commands

Commands the runner executes in **Phase 5**. **Every FR needs at least one table row
with a runnable backticked command** (allowlisted prefix, no shell metacharacters,
single line — and never a pipe character inside a backticked command in this table).
`gate check` lints this section; `gate run` executes it and refuses unsafe rows.

| FR   | Command / Check                                              | Scope | Notes |
| ---- | ------------------------------------------------------------ | ----- | ----- |
| FR-1 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | an unregistered on-disk script fails the audit, with the directory read from config |
| FR-2 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | hooks, bundle membership, and sibling script bodies each count as a surface; a YAML comment still does not; a verify-prefixed body wires nothing |
| FR-2 | `pnpm --filter provegate test test/config-wiring.test.ts`     | pkg   | the three defaults resolve, absolute and escaping paths are rejected, and an absent directory is not an error |
| FR-3 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | the full deny matrix and its paired positive controls. Wires: interpreter plus bare path, a plainly quoted script path, an environment wrapper, deno with its run subcommand and deno without it, bundle membership, and a real invocation after an unquoted separator or an escaped-away one. Does not wire: the echo form, ANY command whose script path is preceded by a dash token — syntax check, eval payload, preload, harmless flag alike — a basename in any token after the path, a deno subcommand other than run, a run subcommand under any other head, an invocation sitting inside a shell comment even when the comment contains a separator, a separator quoted or escaped inside a run, a quoted run left open when a newline arrives (the whole surface), an invocation split by a backslash-continued line, and a bundle declaration that is escaped, indented, duplicated, or impostored inside a template literal |
| FR-4 | `pnpm --filter provegate test test/changeset-entry.test.ts`   | pkg   | one entry declares a minor bump and names the three config keys and the recognized surfaces |

Cross-cutting floor (run before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm test` — added tests pass; existing tests unchanged
- `pnpm build` — clean build
- `pnpm verify:gates-wired` — the script this audit will replace still agrees with the
  repository's real wiring while both exist

Hard caps (when your gates manifest configures them):

- Deny test: `packages/provegate/test/wiring.test.ts` — an unregistered on-disk script and
  every row of FR-3's deny matrix must each fail, each beside its paired positive control on
  the same shape. A matcher that only passes on good input is not evidence.
- Contract test: n/a — no client-to-server payload ships.

Before Phase 2 PASS, run: `gate check PRD-025`

---

## 12. DO NOT (Anti-Patterns)

Explicit forbidden moves for this PRD. Catches drift the agent might otherwise
rationalize.

- DO NOT introduce `any`; use `unknown` plus narrowing.
- DO NOT touch paths outside the Conflict Surface without recording the decision.
- DO NOT delete any script, packed file, installer map entry, or exceptions file. Every
  deletion is PRD-026, in one commit. This PRD makes them safe and stops there.
- DO NOT port a surface set without the predicate that reads it. `auditWiring` resolves
  package-manager commands and matches nothing else, so appending hook and bundle text
  registers zero new wiring on its own. This exact mistake was made and independently
  caught in the PRD-023 wave.
- DO NOT leave the interpreter list open-ended. A list ending in an ellipsis is not a rule;
  an implementer cannot falsify it. The list is closed, in source, and extended only by a
  code change with a test.
- DO NOT add a flag-semantics table of any kind — a non-executing list, an arity table, a
  per-interpreter table, a "known safe flags" allowlist. The narrowed shape has none, and
  the absence is the requirement: four consecutive independent rounds each found the next
  defect inside that machinery, and the owner's direction of 2026-07-28 was to remove the
  layer rather than perfect it. Reintroducing it under another name is a change to this PRD,
  not an implementation detail.
- DO NOT reuse, extend, or mirror `NON_EXECUTING_FLAGS` or `VALUE_FLAGS`. Both are defined
  against package-manager grammar and stay package-manager-scoped. The interpreter rule
  needs no counterpart to them, which is why none is added.
- DO NOT wire a command whose script path is preceded by **any** `-`-leading token, however
  harmless the flag looks. `--enable-source-maps` is harmless and is still refused; that
  false negative is the accepted trade, and its remedies — drop the flag, or add a justified
  `wiringExceptions` entry — are stated in FR-3(b). A meta-gate may under-report and say so;
  it may not over-report silently.
- DO NOT accept any `deno` subcommand other than the literal `run`, DO NOT infer a
  subcommand from a token's shape, and DO NOT extend the exception to another head. Deno's
  two forms both wire; everything else — including `bun run <path>` — reads that token as
  the path and matches nothing. That false negative is stated in FR-3(b); widening is a code
  change with a test.
- DO NOT read a shell comment as wiring. A `#` beginning a token outside quotes is discarded
  through the newline, so a commented-out invocation declares nothing even when it contains
  a separator. Without this the `&&` in `# build && node <path>` cuts a live command out of
  a dead line, which is a false positive — the one direction this gate must not have.
- DO NOT treat the segmentation scanner and the command lexer as two passes. One scan
  carries the quote and escape state, and both the command boundaries and the tokens fall
  out of it. Two passes is exactly how the three boundary cases — `\\;`, backslash-newline,
  and a quoted run left open at a newline — disagreed with each other for two review rounds.
- DO NOT segment a surface into commands blind to quoting. Splitting on `;`, `&&`, `||`
  without the scanner's state is what production does today (`wiring.ts:231`) on the
  surfaces it currently reads, and carrying it into a hook body would cut real invocations
  apart at separators inside quoted arguments.
- DO NOT anchor the bundle grammar anywhere but column zero. "Top-level" is a fact about a
  JavaScript parse tree and this audit has no parser; a line-and-column anchor is what a
  zero-dependency scanner can actually decide, and the one real bundle satisfies it
  unmodified (measured 2026-07-28, `verify-workflow.mjs:15-26`). Do not edit a bundle to fit
  the grammar either — that inverts which one is the evidence.
- DO NOT resolve a bundle ambiguity by picking a declaration. More than one opening line
  means no membership, even when one of them is obviously an impostor inside a template
  literal. The surface count is what makes that loss visible; guessing is what makes it
  invisible.
- DO NOT write a second containment check. `resolveContainedPaths` already exists in
  `config/load.ts`; export it and call it. Two implementations of one rule is
  `two-parsers-wrong-together` — the failure that happens is both being wrong the same way,
  which no comparison between them can detect. `containedPath` in `run/init.ts` is not the
  substitute: it is write-oriented and resolves the target's parent, not the target.
- DO NOT match the basename as raw text across every surface. Command surfaces get the
  command rule; the bundle gets its member list parsed. One rule for both re-creates the
  echo-counts-as-wiring defect one level down.
- DO NOT count verify-prefixed script bodies as surfaces. Without that exclusion a bundle
  listing its own members marks them all wired by existing, and two checks naming each
  other wire themselves.
- DO NOT widen the CI reading from `run:` text to the whole workflow file. The narrower
  reading is correct: a check named in a YAML comment is not wired.
- DO NOT carry any of the script's three repository literals — the hooks directory, the
  bundle path, or the verify scripts directory — into the package as literals. This repo
  sets its hooks path in a `prepare` script; an adopter may use a different one or the git
  default.
- DO NOT treat an absent hooks directory, or a bundle with no parseable member list, as an
  error. Absence is a legitimate configuration and means "not a surface".
- DO NOT bring the class ledger or the decision-record comparison back into this PRD, or
  into `auditWiring`. `gate check --wiring` runs for every adopter, and the ledger's
  `method` class is structurally unreachable for one — they cannot move a check into
  `packages/provegate`. Owner decision of 2026-07-27: the ledger is repo-class and ships in
  PRD-026.
- DO NOT make `auditWiring` read any repository-local artifact — a ledger, a decision
  record, a status board. Everything it reads must come from config or from the manifest,
  or it is shipping this repository's shape to every adopter.
- DO NOT fall back to substring matching when the scanner, the interpreter list, the path
  rule, or the bundle grammar refuses an input. Unparseable and ambiguous both mean no
  wiring declared. A fallback path re-creates exactly the matcher this PRD replaces,
  reachable only on malformed input where nobody will look for it.
- DO NOT ship a deny fixture without its positive control on the same shape. A "does not
  wire" assertion that would have failed anyway is not evidence.
- DO NOT add this PRD's changeset entry while leaving `changeset-entry.test.ts` selecting
  its subject by "provegate minor plus a compatibility sentence". That predicate then
  matches two entries and `find` resolves it by directory order. Give each assertion group
  a discriminator naming its own entry's subject.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-28 | Claude Fable 5 remediation session (round 2), on owner direction | **The command grammar narrows radically, on the owner's in-session direction of 2026-07-28, after four consecutive independent rounds each found a defect one level deeper inside it** — enumerate, then lexer, then segmentation and arity, then per-interpreter semantics (6.28 → 7.00 → 7.23 → 7.08, every closure holding and the score still falling). That is `scope-out-the-layer-the-rounds-keep-hitting`, so the flag-semantics machinery is **removed rather than perfected**. The readiness verdict's other structural exit — landing the grammar as an owner-approved design artifact the PRD binds to, the PRD-030 state-model way — was considered and **not taken**: it would preserve the layer the rounds keep hitting and relocate it, where narrowing deletes it. **One scanner pass replaces Layers 0 and 1**, defined by scanner state rather than prose adjacency: a backslash escapes the next character except a newline; a newline always cuts; `;`, `&&`, `||` cut only outside quotes with an unescaped first character. The three boundary cases iteration 4 named are now consequences with fixtures — `\\;` cuts (the first backslash escapes the second, so the separator is unescaped by state), a backslash before a newline does not continue the line, and a quoted run therefore cannot span a newline, which makes such a quote unterminated and the **whole surface** unparseable. **Layers 2-4 collapse into one command shape with no flag semantics at all**: strip `NAME=value` and `env` wrappers; head token in the closed list; one optional literal `run` after `deno` (so `deno run path` and `deno path` both wire); the **immediately next** token is the path, bare or quoted, and it must not start with `-`; everything after it is an argument. **Any dash token before the path refuses the command**, which deletes the ten-row arity table and the global non-executing table together — `node --check path`, `node -e "…"`, `node --require x.mjs app.mjs` and `node --enable-source-maps path` now resolve identically and for one reason, and the `-c` collision, the `--tsconfig`/`--tsconfig-override` error and the per-head-validity hole are not answered but **unasked**. The residual is stated in both directions: a flagged-but-legitimate invocation is a **false negative** whose remedies are dropping the flag or a `manifest.wiringExceptions` entry — the cheap direction for a meta-gate, since it surfaces as "wired nowhere" (`wiring.ts:245-247`) and never as a silent pass — while **no false-positive form survives** that the deleted tables defended against, because eval, syntax-check and preload forms all carry a dash token before the path; and the one residual running the other way (a backslash-continued `echo` whose next line begins an invocation) is disclosed rather than left to be found. **The bundle's outer grammar becomes line- and column-anchored**, because "top-level" is a fact about a parse tree a zero-dependency scanner does not have: a declaration opens at a column-zero line beginning exactly `const CHECKS = [`, closes at the first line whose first non-whitespace is `];`, and admits only single-literal element lines, whole-line `//` comments, and blanks between them; more than one opening line anywhere — including inside a template literal — is ambiguous and declares no membership. The impostor consequence is stated honestly: an impostor **disables** the surface rather than forging membership, and the loss is visible through the surface count this document already requires. **Measured**: `scripts/verify/verify-workflow.mjs` satisfies the grammar unmodified — opening line at column zero (`:15`), ten single-quoted single-line members (`:16-25`), `];` at column zero (`:26`), and the only opening line in the file, the other two `CHECKS` mentions being a membership test (`:53`) and a loop header (`:64`). **The deny matrix is rewritten to the narrowed set**, every row still paired with a positive control on the same shape, adding the three scanner boundary cases, one row per deleted table's headline case, the deno-subcommand row, the after-the-path row, the wrapper row, and four bundle rows (column anchor, template-literal impostor, escape, duplicate); the old "basename as an option value" case is recorded as **subsumed** by the dash rule rather than deleted silently. **Three gaps found while writing rather than at the next re-score, all in the same fail-closed spirit**: the scanner gains a `#`-comment rule, because a hook file is a shell script and `# build && node <path>` would otherwise have its `&&` cut a live command out of a dead line — a false positive, and the rule this document already states one surface over for YAML comments; `env` carrying anything but `NAME=value` (`env -i`, `env -u`) leaves a non-interpreter head and declares nothing, so no `env` option table is needed either; and the backslash rule is uniform across quote states, a deliberate divergence from a shell's literal backslash inside single quotes, disclosed with its fail-closed consequence. Two further residuals are named rather than left for a fifth round: `bun run <path>` does not wire, because the subcommand exception is deno's alone, and a backslash-continued `echo` whose next line begins an invocation reads as two commands. **The two iteration-4 P2s close**: the Layer-0 divergence example is reframed as the consequence of FR-2's future surfaces rather than current behavior, since today's audit reads only manifest commands and CI `run:` text (`wiring.ts:214-223`); and the introduction's "the audit and the ledger must be complete" now marks the ledger as PRD-026's in the same sentence. **Swept**: Success Metrics (the grammar row rewritten, a bundle-anchor row added), Primary Goals, User Stories, §5's flag-table non-goal, §6 (six criteria rewritten, four added), §7 Architecture (a narrowing principle added), the §11 FR-3 row, and §12, where the three arity DO NOTs become five narrowing DO NOTs. Memory Inputs gain `scope-out-the-layer-the-rounds-keep-hitting` as applied, and `narrow-the-grammar-not-the-parser` now carries the command narrowing as well as the bundle |
| 2026-07-28 | Claude Fable 5 remediation session, on scorer handoff | **Iteration-3 remediation: three [P1]s and two P2s, each re-verified against live source before it was written.** **FR-3's grammar gains the layer beneath it and the layer inside it.** A normative **Layer 0** segments a hook file or script body into commands in one pass carrying Layer 1's quoting state, cutting at newlines and at unquoted `;`, `&&`, `||`; a separator inside a quoted run does not segment, and an unterminated quote makes the whole **surface** unparseable — no wiring, no crash, no substring fallback. The divergence from production is deliberate and measured: `wiring.ts:231` splits quote-blind, and its cost is a **false negative on a real wiring** — a hook line whose quoted argument contains a separator is cut apart and the first fragment carries an unterminated quote — which for a meta-gate is the expensive direction, because it teaches a repository to add exceptions. **Layer 4 gains option arity**: a closed ten-row table of interpreter flags that consume the NEXT token (`--require`/`-r`, `--import`, `--loader`, `--experimental-loader`, `--preload`, `--env-file`, `--conditions`/`-C`, `--config`, `--import-map`, `--tsconfig`, `--project`/`-P`), modelled on the in-package precedent `VALUE_FLAGS` (`wiring.ts:109-118`), which is why `node --require verify-foo.mjs app.mjs` no longer false-wires. `-c` is deliberately excluded and joins the non-executing list instead: node reads it as `--check`, deno and bun as `--config`, and the fail-closed reading wins. The residual is stated in both directions — an unlisted value flag can still false-wire, and the loose fix breaks `node --experimental-vm-modules scripts/verify/verify-foo.mjs`, so the answer is extending the closed table with a test. **The bundle grammar closes its two gaps**: string literals admit no escape sequences (a backslash or the delimiting quote makes the declaration unparseable), and more than one top-level `CHECKS` declaration is ambiguous and declares no membership — fail-closed, not first-wins, not the union. **The quoted-path contradiction is resolved in FR-3(b)'s favour.** The §11 FR-3 row now states that a plainly quoted script path wires, and names the deny set as the echo form, syntax-check mode, eval payloads, and a basename consumed as an option value; §6 gains the affirmative criterion so no section can be read the other way. The deny matrix is now a table pairing every deny row with its positive control on the same shape. **The three ledger remnants are gone**: Implementation Scope no longer assigns `auditWiring` a ledger check or decision-record comparison, Rollback no longer deletes a ledger file and now covers exactly the three things this PRD ships, and the hard-caps deny line no longer demands an unclassified-script fixture. **The containment seam is in scope.** `resolveContainedPaths` is private in `config/load.ts` (measured — not among that module's exports), so FR-2 instructs exporting it rather than copying it (`two-parsers-wrong-together`), records why `containedPath` (`run/init.ts:234`) is the wrong primitive — write-oriented, and it resolves the target's parent rather than the target — and `load.ts` joins FR-2's Targets, Implementation Scope and the Conflict Surface. The export stays internal because `config/index.ts` re-exports a named list rather than `export *`, so the public API is unchanged. **Staleness swept**: three hardcoded paths rather than two in Goals and FR-2 prose, each with its line; PRD-021 closed 2026-07-27, so both contention notes are replaced by a measured `gate queue` reading and FR-4 extends `changeset-entry.test.ts` rather than creating it; citations refreshed to `validate.ts:454`, `validate.ts:193` and `verify-gates-wired.mjs:64,67`. **One finding beyond the handoff.** `changeset-entry.test.ts` selects its subject as "declares provegate minor AND carries a compatibility sentence" — which describes any new-config-key release note, including the one FR-4 owes — and three of its five assertions then resolve by `readdirSync` order, two of them requiring text true only of PRD-021's entry. FR-4 now requires each assertion group to carry a discriminator naming its own entry's subject, stated as a selection change rather than a strictness change so `strictness-added-during-extraction-is-a-behavior-change` still holds. Memory Inputs gain `two-parsers-wrong-together` and `a-rule-corrected-survives-where-it-is-restated`, both active and indexed |
| 2026-07-27 | Claude Opus 5, on owner direction | **Iteration-1 remediation (Codex, seven [P1]s), plus the owner's ledger decision.** **The ledger and its decision-record comparison leave this PRD entirely.** Applying the record's own test to the ledger says repo-class: it governs which files exist under this repository's scripts directory, not the method's artifacts. Keeping it here made a repository-local artifact a hard requirement of `auditWiring`, which `gate check --wiring` runs for every adopter, where `method` — "move it into the package" — is structurally unreachable, and `gate init --practices` installs neither file (finding C). It also dissolves finding D's contradiction: with the ledger in PRD-026, the three doomed scripts are simply absent by the time it exists, so they are neither `method` nor pending. Findings C, D and E close by relocation, and PRD-026's finding A — the missing forward half — closes because one PRD now owns both the ledger and the deletions whose rows it must lose. **FR-3's grammar is now actually closed** (finding A): a four-layer specification — a minimal POSIX word-splitting lexer with quoting and escapes, wrapper stripping, a directory-stripped head-token list, and positional-argument matching with an explicit non-executing flag table. It states the consequence an earlier draft could not: a quoted script path **does** wire, because the lexer strips quotes; only an eval payload does not. The bundle rule names its grammar too — a top-level `const CHECKS` array of string literals — and the audit reports how many surfaces it read, so a silently-lost surface is visible. **FR-1 gets the predicate it lacked** (finding B): `verifyScriptPattern` matches script *names* and cannot select a *filename*, so selection and registration are two rules, and registration is decided by FR-3's command rule rather than the deleted script's substring search. **The released-config rollback is fixed** (finding G): config validation rejects unknown keys, so deleting them post-release would break an adopter's config load; the revert keeps the block as deprecated-and-ignored or ships removal as a migration. **Runtime symlink containment added** (finding I) for all three read paths, with a fixture each. **The hardcoded-path metric is corrected** (finding H): the shipped audit holds none, the script holds three. `changeset-entry.test.ts` is claimed (finding F). FRs renumbered 1-4 |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split from PRD-023 (owner decision, 2026-07-27), carrying its FR-1, FR-3 in all its parts, and FR-4.** PRD-023 sat between 6.65 and 7.19 across four independent rounds; the recorded diagnosis was size. Two things change in the carry-over rather than being copied. **FR-3 gets a closed grammar**: iteration 6 found that PRD-023's open-ended interpreter list "reusing the existing non-executing-flag discipline" was unfalsifiable — that discipline is package-manager-scoped and there is no interpreter parser to reuse — so the interpreter list is now closed and in source, environment wrappers and non-executing modes are enumerated, positional-only matching is required, and the deny matrix is part of the requirement. **FR-5's ledger classification changes because of the split**: the three scripts being deleted are `method-pending` here, not `method`, because their CLI replacements arrive with PRD-026 — which has the useful property that this ledger goes red on its own if PRD-026 never lands. The exceptions-store consolidation and every deletion move to PRD-026. Created with `gate new` |
