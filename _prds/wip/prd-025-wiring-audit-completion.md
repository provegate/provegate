# PRD-025: Wiring Audit Completion — The Meta-Gate That Makes a Fourth Duplicate Fail

> **Status**: Draft
>
> **Created**: 2026-07-27
> **Updated**: 2026-07-28
> **Author**: Claude Opus 5, for owner review
> **Audience**: Implementing Agent
> **Slug**: `wiring-audit-completion`
> **Cycle Phase**: 1 (PRD Generation)
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
and the ledger must be complete before anything is deleted**, because the scripts PRD-026
removes are currently the only implementation of guarantees the package does not have.

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
- [ ] Specify the matching rule as a **closed grammar**, not an open-ended list. An earlier
      revision of this work said "an executing interpreter (`node`, `bun`, `tsx`, …)" and
      an independent review correctly called that unfalsifiable.
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
| Command-grammar layers specified | 4, and the lowest of them started at tokenizing *a command* — nothing said how a surface becomes commands, and layer 4 read a value only in the `--flag=value` form | 5, numbered from zero: segmentation, tokenize, wrappers, head token, argument position with two closed flag tables | FR-3(b), plus deny-matrix rows keyed to layers 0, 1 and 4 |
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
3. **FR-3 — The matching rule, as a closed grammar.** Adding surfaces without changing how
   they are read registers nothing, and specifying the reading loosely is no better. Both
   mistakes were made in PRD-023 and both were caught independently; the resolution is here
   in full.

   **Why new machinery is needed.** `auditWiring`'s `wiredIn` is `wiredScripts.has(script)`
   (`wiring.ts:236`), and `wiredScripts` is built by running each command through
   `packageScriptOf` (`wiring.ts:229-235`), which returns null unless the first token is
   `pnpm`, `npm`, `yarn`, or `bun` (`wiring.ts:130-133`). It is a package-manager command
   resolver. The two new surfaces do not use that form at all: a hook body runs an
   interpreter against a **path**, and the bundle declares a **bare basename**. Neither
   `NON_EXECUTING_FLAGS` nor `VALUE_FLAGS` can simply be reused, because both are defined
   against package-manager grammar, not interpreter grammar — `--dir` and `--filter` mean
   nothing to `node`, and `--require` means nothing to `pnpm`. The layer beneath them is
   not reusable either: `wiring.ts:231` segments every surface without tracking quotes, so
   the command boundaries the existing parser is handed are already wrong for these
   surfaces before any flag table is consulted.

   **(a) Derive the key.** For each registered script matching `verifyScriptPattern`, take
   the `.mjs` file its `package.json` body invokes, resolved under `wiring.scriptsDir`.
   That basename is the key the two new surfaces are matched against.

   **(b) Command surfaces — hooks and non-verify script bodies — get a command rule, and
   the rule starts below the lexer, at segmentation.** An earlier draft enumerated
   interpreters and flags and called that closed. It was not: without tokenization it could
   not say what "inside a quoted string" means, and `node "scripts/verify/verify-foo.mjs"`
   is a perfectly ordinary executing invocation. A later draft added the lexer and began at
   tokenizing *a command*, which left the layer beneath it undefined: nothing said how a
   hook file or a script body **becomes** commands. The grammar is therefore specified in
   five layers numbered from zero, each independently testable.

   **Layer 0 — segment the surface into commands.** A surface is a whole hook file body or
   a whole `package.json` script body. It is segmented into commands in **one pass that
   carries the same quoting state as Layer 1** — single quotes, double quotes, backslash
   escape — cutting at a newline and at an **unquoted** `;`, `&&`, or `||`. A separator
   inside a quoted run, or preceded by a backslash, is ordinary text and does not segment.
   Each resulting command is then handed to Layer 1 whole. Because the quoting state is
   read once and shared, a surface has exactly one segmentation, not one per layer.

   An **unterminated quote anywhere in the surface makes the whole surface unparseable**:
   no wiring is declared from it, no partial segments are salvaged, and it is never a crash
   and never a substring fallback. This is the same rule Layer 1 states for a single
   command, applied one level up — the surface is the unit, because a quote opened in one
   line is not closed by a separator in the next.

   **This deliberately diverges from production, and the divergence is the point.**
   `auditWiring` today splits every surface with `text.split(/[\n;]|&&|\|\|/)`
   (`wiring.ts:231`, measured 2026-07-28), which is quote-blind. The cost is a **false
   negative on a real wiring**, which for a meta-gate is the expensive direction: a hook
   line `node scripts/verify/verify-foo.mjs --message "build && deploy"` is cut at the
   quoted `&&`, and the first fragment carries an unterminated quote, so a genuinely wired
   check reports as wired nowhere and the repository learns to add an exception. Layer 0
   reads that line as one command and wires it. In the other direction the two rules agree
   on the verdict by different routes — `echo "run node verify-foo.mjs; done"` yields
   unparseable fragments under production's split and a single `echo` command under Layer 0,
   and neither wires anything.

   **One residual, stated rather than discovered.** Layer 0 cuts at `;`, `&&`, and `||`
   only — not at a single `|` or `&` — which matches the separator set production already
   uses. A command reachable only through a pipe or a background operator is therefore not
   segmented out and declares no wiring. That is the fail-closed direction, and widening the
   set is a code change with a test, like every other widening here.

   **Layer 1 — tokenize.** Split the command into tokens on unquoted whitespace. A single-
   or double-quoted run is **one token**, and the quotes are stripped; a backslash escapes
   the next character. This is the minimal POSIX-word-splitting subset and nothing more: no
   variable expansion, no globbing, no command substitution. A command containing an
   unterminated quote is **unparseable** and yields no wiring — never a crash, and never a
   fallback to substring matching.

   **Layer 2 — strip wrappers.** Discard leading `NAME=value` assignments and a leading
   `env` together with any of its own `NAME=value` arguments. What remains is the head
   token.

   **Layer 3 — head token.** It must be one of exactly `node`, `bun`, `deno`, `tsx`,
   `ts-node`, compared after stripping any directory prefix so `/usr/bin/node` counts. The
   list is a source constant, not config: an adopter silently widening their own gate is
   the failure this PRD is about, and adding an interpreter should cost a code change and a
   test. Anything else — `echo`, `cat`, `printf`, a package manager, a comment marker — is
   not an interpreter invocation.

   **Layer 4 — argument position, with option arity.** Walk the remaining tokens. A token
   starting with `-` is an option, decided against **two closed source-level tables**.

   *Non-executing options.* If the option is any of `--check`, `-c`, `-e`, `--eval`, `-p`,
   `--print`, `--help`, `-h`, `--version`, `-v`, `--dry-run`, the command **executes
   nothing** and yields no wiring, whatever follows it.

   *Value options — the arity table.* These consume the **next token** as their value, so
   that token is never read as the script path:

   | Option | Where it comes from |
   | ------ | ------------------- |
   | `--require`, `-r` | node CJS preload; ts-node; `-r` is bun's `--preload` |
   | `--import` | node ESM preload |
   | `--loader`, `--experimental-loader` | node |
   | `--preload` | bun |
   | `--env-file` | node, bun |
   | `--conditions`, `-C` | node `--conditions`; ts-node reads `-C` as `--compiler`, same arity |
   | `--config` | deno, bun |
   | `--import-map` | deno |
   | `--tsconfig` | tsx, bun |
   | `--project`, `-P` | ts-node |

   **The table is closed**, lives in source next to the interpreter list, and is extended
   only by a code change plus a test — the same discipline the interpreter list carries and
   for the same reason. Any `-`-leading token **not** in either table consumes nothing.

   `-c` is deliberately absent from the arity table: node reads it as `--check`, deno and
   bun read it as `--config`, and one table cannot mean both. The ambiguity resolves to the
   **fail-closed** reading, so `-c` joins the non-executing list above, and
   `deno -c cfg.json script.mjs` declares no wiring.

   An option written `--flag=value` consumes its own value and does **not** also consume the
   next token, in both tables. Otherwise the first token not starting with `-` and not
   consumed as an option value is the **script path**: the basename matches when that path's
   basename equals it. A basename appearing in any **later** token, or in a token consumed as
   an option value, does not count.

   **This is the discipline the package already demonstrates one grammar over.**
   `packageScriptOf` needs `VALUE_FLAGS` (`wiring.ts:109-118`) for exactly this reason —
   without it, `pnpm --dir . run verify:brain` resolved to `.` — and the same hole exists
   here: with no arity table, `node --require verify-foo.mjs app.mjs` reads
   `verify-foo.mjs` as the first non-dash token and falsely wires it.

   **The residual is real and is closed by extension, not by loosening.** A value-taking
   flag that is not in the table consumes nothing, so an invocation using one can still
   false-wire; the answer is adding the flag and its test. The loose alternative — every
   `-`-leading token consumes the next — breaks the opposite case:
   `node --experimental-vm-modules scripts/verify/verify-foo.mjs` takes no value, and the
   loose rule would swallow the real script path and declare no wiring at all. Closed in
   both directions is the only version that is falsifiable.

   These two tables are separate from `NON_EXECUTING_FLAGS` and `VALUE_FLAGS`, which stay
   package-manager-scoped, and live beside them with a comment saying why the pairs are not
   merged. Note the consequence, stated rather than discovered:
   `node "scripts/verify/verify-foo.mjs"` **does** wire, because layer 1 strips the quotes
   and layer 4 reads it as the script path. What does not wire is an eval payload, a
   syntax-check invocation, and a basename sitting in an option value — each reachable only
   through one of the two tables above.

   **(c) The bundle is data, not a command — read its membership, under a stated grammar.**
   "Parse structurally" is not a specification either, so: the bundle declares its members
   as a **top-level `const CHECKS = [ … ]` array of string literals**, single- or
   double-quoted, one per element, with `//` line comments and trailing commas permitted.
   Read exactly that. Anything else — a computed array, a spread, a different identifier, a
   nested declaration, an unterminated literal — declares **no** membership.

   **Two gaps an earlier draft left open, closed here.**

   1. **String literals admit no escape sequences.** A literal containing a backslash, or
      containing its own delimiting quote character, makes the **declaration** unparseable
      and the bundle declares no membership. Not that element skipped — the whole
      declaration, because a parser that guesses at one element's escaping has already
      stopped agreeing with the JavaScript engine that runs the file. A member is a
      filename; a filename needing an escape is not a case this grammar serves, and half an
      escape rule is `narrow-the-grammar-not-the-parser` inverted — widening the parser
      instead of narrowing what is read.
   2. **More than one top-level `CHECKS` declaration declares no membership.** Not
      first-wins, not last-wins, not the union: two declarations are ambiguous about which
      list is the bundle's, and guessing produces a membership set no reader of the file
      would predict. Ambiguous is treated exactly as unparseable — fail closed, no
      membership, no error.

   Do not grep the body: a bundle is a list of members that happens to live in a script, and
   substring-matching its text is reading the wrong thing —
   `narrow-the-grammar-not-the-parser`. A bundle path that does not exist, or whose contents
   declare no parseable member list, is **not a surface** — the same rule as an absent hooks
   directory. Absence and unparseability are both "no membership declared", never an error,
   and never a fallback to text search.

   **The narrowness is the point and it has a cost.** A repository that renames its bundle
   array loses the surface silently. That is the correct trade against the alternative,
   which is the substring matching this PRD exists to remove — but it must be visible in the
   audit's output, so the audit reports how many surfaces it actually read.

   **The deny matrix is part of the requirement, not an afterthought.** Every row below
   must leave the check unwired, every row has a fixture, and **every row is paired with a
   positive control on the same shape** — a deny fixture whose input would fail anyway is
   not evidence (`assert-absent-needs-an-independent-cause`). The pairing is what makes the
   left column mean "this rule rejected it" rather than "something rejected it".

   | Layer | Does **not** wire | Paired positive control, same shape |
   | ----- | ----------------- | ----------------------------------- |
   | 0 | a hook body whose only `&&` sits inside a quoted run, so the quoted text never becomes its own command | the same hook with an unquoted `&&` chaining a real interpreter-plus-path invocation |
   | 0 | a surface with an unterminated quote — no wiring from **any** of its lines | the same surface with the quote closed |
   | 1 | the basename inside a token quoted as part of an option value | `node "scripts/verify/verify-foo.mjs"` — quoted script path, **wires**, because layer 1 strips quotes |
   | 3 | a non-verify script body that echoes the basename | the same body with `node` in the head position |
   | 4 | an interpreter invoked in syntax-check mode (`--check`, `-c`) against the path | the same path with no mode flag |
   | 4 | an interpreter eval string (`-e`, `--eval`) mentioning the file | the same interpreter and file as a positional argument |
   | 4 | `node --require verify-foo.mjs app.mjs` — the arity table consumes `verify-foo.mjs` as `--require`'s value | `node --require ./setup.mjs scripts/verify/verify-foo.mjs` — the flag takes `./setup.mjs`, the next unconsumed token is the script path, **wires** |
   | (c) | a bundle whose member literal contains a backslash or its own delimiting quote | the same bundle with the member written plainly |
   | (c) | a bundle with two top-level `CHECKS` declarations | the same members under one declaration |
   | FR-2 | the basename inside a YAML comment | the same text in `run:` position |
   | FR-2 | the basename inside a verify-prefixed script body (the FR-2 exclusion) | the same body under a non-verify script name |

   Three further positives stand on their own, because they are the shapes the whole port
   exists to recognize: a plain interpreter-plus-path invocation in a hook, the same behind
   an environment wrapper, and the bare basename in the bundle's declared member list all
   **do** wire the check.
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
- **Making the interpreter list or its two flag tables configurable.** A closed
  source-level list is the point: a config knob that lets a repository widen its own gate is
  the failure mode the meta-gate exists to prevent. Extension is a code change with a test,
  for all three tables.
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
- **Given** a check named only by its bare basename in the bundle's declared member list,
  **Then** it is wired.
- **Given** a check named only in a non-verify script body as the argument of an echo,
  **Then** it is **not** wired.
- **Given** an interpreter invoked in syntax-check mode against the path, and separately an
  eval string mentioning the file, **Then** neither wires it.
- **Given** a hook that invokes an interpreter against the script's path written **in
  quotes**, **Then** it **is** wired — the lexer strips quotes and the path is an ordinary
  positional argument. This is the case the grammar went out of its way to state; it is
  affirmed here so no section of this document can be read the other way.
- **Given** a hook body whose only `&&` sits inside a quoted run, **Then** the quoted text
  is not read as a separate command, and **Given** the same body with the `&&` unquoted,
  **Then** the command after it is read and wires.
- **Given** a surface with an unterminated quote, **Then** no line of it declares wiring,
  and the audit completes rather than failing.
- **Given** `node --require verify-foo.mjs app.mjs`, **Then** `verify-foo.mjs` is **not**
  wired — the arity table consumes it as the flag's value — and **Given**
  `node --require ./setup.mjs scripts/verify/verify-foo.mjs`, **Then** it **is** wired.
- **Given** a bundle whose member literal carries a backslash or its own delimiting quote,
  and separately a bundle with two top-level `CHECKS` declarations, **Then** neither
  declares any membership, and neither is an error.
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
- **Kind decides the rule.** Hooks and script bodies are commands and get a command
  parser. The bundle is data and gets its member list parsed. One rule for both is what
  produced the echo-counts-as-wiring defect.
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
  discipline three of this document's iterations have needed
- `_readiness/wip/readiness-023-gate-self-hosting.md` sections 8 and 9 — where the matching
  rule was found missing, then found underspecified
- PRD-023 sections 4 and 7 — the requirements this PRD carries forward

---

## Memory Inputs

- applied: `gate-wire-or-delete` — this PRD is that record's mechanism: every registered
  check wired to an executing surface, every on-disk check registered. FR-1 and FR-2 close
  the two halves the package could not see.
- applied: `narrow-the-grammar-not-the-parser` — FR-3(c) reads the bundle's declared member
  list instead of grepping its body, because a bundle is data and text-matching it is
  reading the wrong thing.
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
- applied: `a-rule-corrected-survives-where-it-is-restated` — the iteration-3 findings were
  three corrections and their unswept restatements. Every rule changed in the 2026-07-28
  round was then grepped across the whole document: the two flag-table DO NOTs, the
  "hooks directory or the bundle path" literal rule (three literals, not two), the
  no-fallback rule, and the §11 quoted-path row all moved with their owning sections.
- reviewed: `fixture-must-reach-production-shape` — the wiring fixtures call `auditWiring`
  with the config and manifest its real callers pass, not hand-built arguments.

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
| FR-3 | `pnpm --filter provegate test test/wiring.test.ts`            | pkg   | the full deny matrix and its paired positive controls. Wires: interpreter plus bare path, a plainly quoted script path, an environment wrapper, bundle membership, and a real invocation after an unquoted separator. Does not wire: the echo form, syntax-check mode, an eval payload, a basename consumed as an option value, a separator quoted inside a run, an unterminated quote anywhere in the surface, an escaped or requoted bundle literal, and two top-level CHECKS declarations |
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
- DO NOT reuse `NON_EXECUTING_FLAGS` or `VALUE_FLAGS` for interpreters. Both are defined
  against package-manager grammar. Interpreters get their own pair of tables — non-executing
  modes and value arity — beside them, with a comment saying why neither pair is merged.
- DO NOT give layer 4 a non-executing table without an arity table. Half the pair is the
  defect: with no arity rule, `node --require verify-foo.mjs app.mjs` reads the flag's value
  as the script path and declares wiring that does not exist.
- DO NOT answer a missing arity entry by making every `-`-leading token consume the next.
  That breaks the opposite case — `node --experimental-vm-modules scripts/verify/verify-foo.mjs`
  takes no value, and the loose rule swallows the real script path. Add the flag to the
  closed table with a test.
- DO NOT segment a surface into commands without the lexer's quoting state. Splitting on
  `;`, `&&`, `||` blind to quotes is what production does today (`wiring.ts:231`), and it
  cuts real invocations apart at separators inside quoted arguments.
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
- DO NOT fall back to substring matching when segmentation, the lexer, the interpreter
  list, the arity table, or the bundle grammar refuses an input. Unparseable and ambiguous
  both mean no wiring declared. A fallback path re-creates exactly the matcher this PRD
  replaces, reachable only on malformed input where nobody will look for it.
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
| 2026-07-28 | Claude Fable 5 remediation session, on scorer handoff | **Iteration-3 remediation: three [P1]s and two P2s, each re-verified against live source before it was written.** **FR-3's grammar gains the layer beneath it and the layer inside it.** A normative **Layer 0** segments a hook file or script body into commands in one pass carrying Layer 1's quoting state, cutting at newlines and at unquoted `;`, `&&`, `||`; a separator inside a quoted run does not segment, and an unterminated quote makes the whole **surface** unparseable — no wiring, no crash, no substring fallback. The divergence from production is deliberate and measured: `wiring.ts:231` splits quote-blind, and its cost is a **false negative on a real wiring** — a hook line whose quoted argument contains a separator is cut apart and the first fragment carries an unterminated quote — which for a meta-gate is the expensive direction, because it teaches a repository to add exceptions. **Layer 4 gains option arity**: a closed ten-row table of interpreter flags that consume the NEXT token (`--require`/`-r`, `--import`, `--loader`, `--experimental-loader`, `--preload`, `--env-file`, `--conditions`/`-C`, `--config`, `--import-map`, `--tsconfig`, `--project`/`-P`), modelled on the in-package precedent `VALUE_FLAGS` (`wiring.ts:109-118`), which is why `node --require verify-foo.mjs app.mjs` no longer false-wires. `-c` is deliberately excluded and joins the non-executing list instead: node reads it as `--check`, deno and bun as `--config`, and the fail-closed reading wins. The residual is stated in both directions — an unlisted value flag can still false-wire, and the loose fix breaks `node --experimental-vm-modules scripts/verify/verify-foo.mjs`, so the answer is extending the closed table with a test. **The bundle grammar closes its two gaps**: string literals admit no escape sequences (a backslash or the delimiting quote makes the declaration unparseable), and more than one top-level `CHECKS` declaration is ambiguous and declares no membership — fail-closed, not first-wins, not the union. **The quoted-path contradiction is resolved in FR-3(b)'s favour.** The §11 FR-3 row now states that a plainly quoted script path wires, and names the deny set as the echo form, syntax-check mode, eval payloads, and a basename consumed as an option value; §6 gains the affirmative criterion so no section can be read the other way. The deny matrix is now a table pairing every deny row with its positive control on the same shape. **The three ledger remnants are gone**: Implementation Scope no longer assigns `auditWiring` a ledger check or decision-record comparison, Rollback no longer deletes a ledger file and now covers exactly the three things this PRD ships, and the hard-caps deny line no longer demands an unclassified-script fixture. **The containment seam is in scope.** `resolveContainedPaths` is private in `config/load.ts` (measured — not among that module's exports), so FR-2 instructs exporting it rather than copying it (`two-parsers-wrong-together`), records why `containedPath` (`run/init.ts:234`) is the wrong primitive — write-oriented, and it resolves the target's parent rather than the target — and `load.ts` joins FR-2's Targets, Implementation Scope and the Conflict Surface. The export stays internal because `config/index.ts` re-exports a named list rather than `export *`, so the public API is unchanged. **Staleness swept**: three hardcoded paths rather than two in Goals and FR-2 prose, each with its line; PRD-021 closed 2026-07-27, so both contention notes are replaced by a measured `gate queue` reading and FR-4 extends `changeset-entry.test.ts` rather than creating it; citations refreshed to `validate.ts:454`, `validate.ts:193` and `verify-gates-wired.mjs:64,67`. **One finding beyond the handoff.** `changeset-entry.test.ts` selects its subject as "declares provegate minor AND carries a compatibility sentence" — which describes any new-config-key release note, including the one FR-4 owes — and three of its five assertions then resolve by `readdirSync` order, two of them requiring text true only of PRD-021's entry. FR-4 now requires each assertion group to carry a discriminator naming its own entry's subject, stated as a selection change rather than a strictness change so `strictness-added-during-extraction-is-a-behavior-change` still holds. Memory Inputs gain `two-parsers-wrong-together` and `a-rule-corrected-survives-where-it-is-restated`, both active and indexed |
| 2026-07-27 | Claude Opus 5, on owner direction | **Iteration-1 remediation (Codex, seven [P1]s), plus the owner's ledger decision.** **The ledger and its decision-record comparison leave this PRD entirely.** Applying the record's own test to the ledger says repo-class: it governs which files exist under this repository's scripts directory, not the method's artifacts. Keeping it here made a repository-local artifact a hard requirement of `auditWiring`, which `gate check --wiring` runs for every adopter, where `method` — "move it into the package" — is structurally unreachable, and `gate init --practices` installs neither file (finding C). It also dissolves finding D's contradiction: with the ledger in PRD-026, the three doomed scripts are simply absent by the time it exists, so they are neither `method` nor pending. Findings C, D and E close by relocation, and PRD-026's finding A — the missing forward half — closes because one PRD now owns both the ledger and the deletions whose rows it must lose. **FR-3's grammar is now actually closed** (finding A): a four-layer specification — a minimal POSIX word-splitting lexer with quoting and escapes, wrapper stripping, a directory-stripped head-token list, and positional-argument matching with an explicit non-executing flag table. It states the consequence an earlier draft could not: a quoted script path **does** wire, because the lexer strips quotes; only an eval payload does not. The bundle rule names its grammar too — a top-level `const CHECKS` array of string literals — and the audit reports how many surfaces it read, so a silently-lost surface is visible. **FR-1 gets the predicate it lacked** (finding B): `verifyScriptPattern` matches script *names* and cannot select a *filename*, so selection and registration are two rules, and registration is decided by FR-3's command rule rather than the deleted script's substring search. **The released-config rollback is fixed** (finding G): config validation rejects unknown keys, so deleting them post-release would break an adopter's config load; the revert keeps the block as deprecated-and-ignored or ships removal as a migration. **Runtime symlink containment added** (finding I) for all three read paths, with a fixture each. **The hardcoded-path metric is corrected** (finding H): the shipped audit holds none, the script holds three. `changeset-entry.test.ts` is claimed (finding F). FRs renumbered 1-4 |
| 2026-07-27 | Claude Opus 5, on owner direction | **Split from PRD-023 (owner decision, 2026-07-27), carrying its FR-1, FR-3 in all its parts, and FR-4.** PRD-023 sat between 6.65 and 7.19 across four independent rounds; the recorded diagnosis was size. Two things change in the carry-over rather than being copied. **FR-3 gets a closed grammar**: iteration 6 found that PRD-023's open-ended interpreter list "reusing the existing non-executing-flag discipline" was unfalsifiable — that discipline is package-manager-scoped and there is no interpreter parser to reuse — so the interpreter list is now closed and in source, environment wrappers and non-executing modes are enumerated, positional-only matching is required, and the deny matrix is part of the requirement. **FR-5's ledger classification changes because of the split**: the three scripts being deleted are `method-pending` here, not `method`, because their CLI replacements arrive with PRD-026 — which has the useful property that this ledger goes red on its own if PRD-026 never lands. The exceptions-store consolidation and every deletion move to PRD-026. Created with `gate new` |
