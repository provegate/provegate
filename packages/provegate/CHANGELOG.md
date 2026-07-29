# provegate

## 0.3.0

### Minor Changes

- 199ce48: Two new corpus sweeps — `gate check --review-artifacts` and
  `gate check --durable-artifacts` — replace the three practices-pack scripts the pack no
  longer ships (`verify-review-artifact.mjs`, `verify-durable-artifacts.mjs`,
  `verify-gates-wired.mjs`; the wiring rule lives in `gate check --wiring`). `gate check
PRD-NNN` now also lints the Durable Artifacts declaration at readiness. An older CLI has
  none of these flags, so upgrade the CLI first, then migrate.

  `gate init` is additive-only by design, so an existing install keeps its old copies until
  you migrate BY HAND. The five steps — the fifth loses data if skipped:

  1. Delete `scripts/verify/verify-review-artifact.mjs`,
     `scripts/verify/verify-durable-artifacts.mjs` and
     `scripts/verify/verify-gates-wired.mjs` — but NOT the exceptions file yet: step 5
     reads it, and deleting it first loses the data step 5 exists to preserve.
  2. Remove the three matching `package.json` script entries.
  3. Remove the three names from the `CHECKS` array in your installed
     `scripts/verify/verify-workflow.mjs`.
  4. Add `gate check --review-artifacts`, `gate check --durable-artifacts` and
     `gate check --wiring` wherever the removed checks ran (CI, hooks, your manifest via
     package-script aliases).
  5. Convert your exceptions: drop the entries for the three removed scripts; map each
     survivor's filename to the `package.json` script that invokes it; DROP every survivor
     that is already wired (the audit refuses a wired exception as stale); record what
     remains in `gates.manifest.json` under `wiringExceptions` with a real, non-whitespace
     justification — and only THEN delete the old `gates-wired-exceptions.json`, as this
     step's last act. If the file is absent there is nothing to do; if it is present but
     empty, skip the conversion and still delete the file — a retired store needs no
     contents to be retired.

  Downgrading back: restore the four files from the pack of the previous release and
  reverse steps 2–5; nothing happens automatically in either direction, which is what makes
  the manual migration safe to publish.

- 1961a3e: Add `valueScoring` to the config surface, and enforce the value-triage recompute at
  `gate check`.

  `workflow.config.json` gains an optional `valueScoring` block: an ordered `axes` list, a
  `weights` map keyed by axis, and an optional `enforceFrom` cutoff. `gate check PRD-NNN`
  now recomputes a work item's declared value total from those weights and refuses a header
  whose arithmetic does not hold; `gate check --value-score` sweeps the whole corpus, which
  is what catches a score edited after its item passed readiness.

  **Compatibility is one-way, so the order matters.** An older CLI rejects `valueScoring` as
  an unknown config key. Upgrade the CLI first, then add the key; and if you downgrade,
  remove the key first. Adding the key to a repository still running an older CLI turns every
  command into a config error.

  **Nothing changes for a config that does not set it.** The shipped default omits
  `enforceFrom` entirely, which selects presence-triggered mode: an item with no value header
  passes, and only an item that declares one has its arithmetic checked. A repository that
  upgrades and adds nothing sees no new failures.

  **The two keys have different merge rules, and both directions are legal.** Supplying
  `valueScoring.axes` requires the complete matching `weights` set, and the pair replaces the
  defaults wholesale — a partial axis list with inherited weights would score against a
  dimension nobody declared. Supplying `weights` alone is a legal partial retune of the
  default axes: move one weight and leave the rest, and the sum-to-1 rule catches it if the
  result no longer adds up.

  **Changing `axes` later is a corpus migration, not a config edit.** A header whose axis
  list disagrees with the config fails, so run `gate check --value-score` first to see which
  items would break, then land the axis change and the header rewrites in one commit.

- 9e5cc1e: Add `gate doctor --memory` and `gate memory find` — two read-only commands for repositories
  that have adopted the closed-loop memory contract.

  `gate doctor --memory [--json]` diagnoses whether a memory install is actually reachable:
  config containment, store root and index, record validation, at least one configured
  entrypoint carrying the index pointer, validator presence and package-script wiring, and
  Phase 7 reachability. Each check has a stable id to grep or branch on. Mandatory failures
  exit 1; CI reachability and unfilled placeholders warn, because a workflow layout is
  user-defined and absence there proves nothing. It never edits config, manifests,
  entrypoints, scripts, or state — on the failing path as well as the passing one.

  `gate memory find [--query] [--paths] [--tag] [--limit] [--json]` is deterministic local
  recall: watched-path overlap, then exact name or tag, then description and name tokens,
  with the slug as a final tie-break, so the same question returns the same bytes on any
  machine. No embedding, no persistent index, no model, no network. Deterministic rather than
  relevant — it augments the always-loaded index rather than replacing it, and every hit
  carries the reasons it matched.

  Both are additive. A repository with memory disabled sees no behaviour change: `find`
  refuses with remediation rather than returning an empty list, and every pre-existing command
  is untouched. Zero runtime dependencies, as before.

- 479c61d: `gate check` closes the §9 Open Questions grammar. The old lint read `deferred` as a
  substring and bullet-start lines of the first matching section only, so a genuine
  unresolved question was invisible whenever it mentioned the word, hid in prose, a
  comment, a fence, a link label, or a second section. Nine hiding places were measured
  across eight successive exemption rules; the ninth rule is a closed set, not a better
  predicate.

  The section body now accepts exactly four raw-line forms: blank, `- (none)`,
  `- Deferred to [PRD-NNN](<path>)`, and one terminal `---`. Everything else fails by
  name. A deferral's referent is resolved through the state layer — configured id width,
  containment in the artifact root, the state builder's own basename parser, existence,
  the state builder's own basename parser with label/target number equality, a
  configured wip/deferred-role state directory, lstat-regular with exactly one hard
  link (symlinks and hardlink aliases refused), realpath containment with the canonical
  state segment equal to the lexical one (directory aliases refused), on-disk basename
  byte-equality against the directory listing (case aliases refused), no `#`, `?`, `%`, `&`,
  `\` or `:` in the path (characters two readers disagree on), and the target's own
  `# PRD-NNN:` H1 — so every variable character of both forms is either fixed syntax or
  verified against a real, distinct, unfinished, filed work item. Exactly one Open
  Questions section and exactly one Functional Requirements section are required;
  duplicates and misses fail instead of being silently half-read.

  This is the method rule of `phase-2-readiness-scorer.md` ("deferred to a follow-up PRD
  with a link") made machine-checkable — no new flag, config key, or exported signature;
  only which documents pass moves.

  Migration, by hand, per wip PRD that now fails `gate check`:

  1. Rewrite each §9 entry to one of the two exact forms. Rationale prose, tails,
     continuations and comments move out of the section (Non-Goals, the header, or the
     changelog) or are deleted.
  2. A deferral needs a real target: create the follow-up first (`gate new`), then defer
     to it — the closed form passes only when the link resolves.
  3. The shipped PRD template states both forms immediately before the §9 heading; an
     older install keeps its old template until you re-copy it.
  4. Completed and deferred historical artifacts are OUTSIDE the migration: rewriting
     history is not required, and the wip corpus is what the readiness gate protects.
     Re-running `gate check` against an already-completed PRD may now honestly report
     §9 failures that were invisible before — expected, not a regression.

  The change is one-directional-safe: a §9 in the closed form also passes the old
  substring rule, so rolling back strands nothing.

- bf942eb: `gate check --prompts` — prompt-store reconciliation (PRD-034). The check recomputes the
  generated set from the installed package and your config (`generatedPaths()`, the same pure
  function the installer uses), compares bytes on disk, and classifies every planned path as
  `current`, `stale` (banner names an older package version — the undelivered-upgrade case),
  `modified` (bytes differ at the installed version: a hand edit or a config-value change,
  indistinguishable), `missing`, or `unattributable` (no banner is parseable — including the two
  deliberately unbannered paths, the codex snippet and `prompts/PLACEHOLDERS.md`). It reads
  exactly the planned set — no directory walk, no orphan discovery — writes nothing, repairs
  nothing, and deletes nothing. A stale report prints the remedy: delete the printed reinstall
  unit, re-run `gate init --prompts`; both steps stay yours.

  New config surface: `prompts.exceptions[]` — the recorded local exception. Entries of exactly
  `{ path, reason, owner, expires }`; a valid, unexpired entry suppresses the `modified` finding
  for its exact path (byte-exact, case-sensitive, canonical report spelling) and suppresses
  nothing else; expired, stale and malformed entries fail by name; no entry ever authorizes a
  write. **Upgrade the CLI first, then add the key** — `prompts.exceptions` is unknown to every
  older validator, so an older CLI rejects a config that carries it.

  **Existing adopters — the bundle wiring is manual, in three steps** (the additive installer
  can never edit your existing files; the CLI path `gate check --prompts` is live immediately on
  package upgrade):

  1. Upgrade the package.
  2. Run `gate init --practices` — the additive installer is what CREATES the new
     `scripts/verify/verify-prompts.mjs` in your tree; upgrading the package alone writes
     nothing into a repository.
  3. Add `verify-prompts.mjs` to the `CHECKS` array of your `scripts/verify/verify-workflow.mjs`
     copy.

  **Behavior change, named:** `prompts.dir` now refuses backslashes at config load. The check's
  canonical report spelling is POSIX, and no spelling can both name a backslash directory and
  stay backslash-free. No known accepted repository, shipped default or fixture configuration
  uses an internal backslash; external adopter usage is unknowable, so the migration is stated
  rather than the need denied:

  1. Pick the new backslash-free directory name and, on POSIX where the old spelling is a
     literal filename, `git mv` the store directory to it (on Windows the same value already
     named the forward-slash-equivalent path — only the config spelling changes).
  2. Edit `prompts.dir` to the new value — **and in the same config edit, update `templates.prd`
     wherever it points beneath the old store spelling**, or `gate new` reads a path that no
     longer exists.
  3. Delete every generated file whose CONTENT embeds `prompts.dir` — that set comes from
     `renderAdapters()`, not from memory: every `.claude/commands/prd-<phase>.md`,
     `.cursor/rules/prd-workflow.mdc`, and the codex snippet
     `<dir>/AGENTS.md.provegate.snippet` — then re-run `gate init --prompts`. The additive
     installer rewrites none of them in place.

  **Downgrade order** (remove the key on rollback): before downgrading below this version,
  remove the **entire `prompts.exceptions` key** — an empty array is still an unknown key to the
  old validator — and un-wire the packed check: remove the `verify-prompts.mjs` member from your
  `verify-workflow.mjs` `CHECKS`, delete `scripts/verify/verify-prompts.mjs`, and — for a
  repository whose fresh install also registered it — the `verify:prompts` package-script entry.
  The packed twin imports symbols this version exports, so downgrading first makes it fail
  loudly at import. Pack installation never deletes; the cleanup is yours.

- dc70174: The wiring audit now recognizes three more executing surfaces: git-hook bodies, the
  verify bundle's declared membership, and non-verify `package.json` script bodies. Three
  new config keys under `wiring` control what it reads — `wiring.scriptsDir` (default
  `scripts/verify`), `wiring.hooksDir` (default `.githooks`), and `wiring.bundlePath`
  (default `scripts/verify/verify-workflow.mjs`) — all repo-relative, lexically validated,
  and containment-checked at read time. A check that was "wired nowhere" may be wired after
  upgrading; that verdict change is the point of the release. The audit's report now also
  lists the surfaces it actually read, so a surface lost to a non-conforming input is a
  visible number rather than a silent absence.

  An older CLI rejects an unknown `wiring` block, so upgrade the CLI first, then add the
  keys. Downgrading back: remove the `wiring` block from your config before reverting the
  CLI. A post-release revert on the package side must keep accepting the block as
  deprecated-and-ignored, or ship the key removal as a stated migration step — deleting the
  keys outright would strand every config that set them.

## 0.2.0

### Minor Changes

- The work-item lifecycle, parallel-agent isolation, and the practices layer.

  - **Lifecycle commands are real.** `gate init` scaffolds the workflow tree and starter
    configs (never overwriting; `--dry-run` composes). `gate new <slug>` creates the next
    work item from the shipped template, resolving concurrent id allocation instead of
    colliding. `gate open PRD-XXX` claims the item's Conflict Surface as a lease and
    refuses on overlap at claim time — naming the holder, phase, and remaining TTL —
    with `--steal` for a stale lease and `--hours=N` for the term. `gate renew` refreshes
    a lease idempotently, re-validating a surface edited since the claim rather than
    grandfathering it; `gate release` drops one under the claim mutex (`--force` to
    release someone else's, and it names them).
  - **Worktree lifecycle.** `gate open --worktree` provisions an isolated checkout in the
    same atomic step as the claim — claim and checkout succeed or fail together, and it
    refuses rather than hand back a tree whose PRD, layout config, or gate policy differs
    from the one just claimed. `gate run` then merges from the claimed checkout, guards
    against branch drift by pinning the verified commit, and tears the tree down afterwards
    under the same mutex; a dirty or reclaimed tree is never force-removed.
  - **The practices layer.** `gate init --practices` additively installs the practice layer
    that grew around the workflow: `_brain/` agent memory (protocol, indexed seed
    learnings, record templates), the `AGENT_BOOTSTRAP.md` / `STATUS.md` templates, a
    base-branch commit guard and pre-commit secret scanner, and a zero-dependency
    `scripts/verify/` check library. It only creates files — no `git config`, no dependency
    install, no edits to an existing `package.json`, and it never writes an agent
    entrypoint. The manual wiring is printed, never performed.
  - **Single-package repos are first-class.** No monorepo required: "workspace" means the
    git repo root, `gate init` never creates `apps/`/`packages/`, and gate commands are
    plain strings, so nothing assumes pnpm or turbo.
  - **Restrained terminal output.** Green means a gate that actually passed, blue means a
    human decision. Under `NO_COLOR` or a non-TTY every card and table is byte-identical
    to the coloured version — glyphs carry the meaning and widths are computed on plain
    text, so `grep` still works.
  - **Conflict detection hardened.** Overlap is decided from the item's declared surface
    rather than a caller override, malformed or one-sided leases fail closed instead of
    being laundered into a plain claim, and lease identity is captured before the gate
    chain runs so a rival's refresh can never redirect a merge or a teardown.

  Still no runtime dependencies, no telemetry, no network calls, and no code path that
  pushes to a remote.

## 0.1.0

### Minor Changes

- First public surface: the gated-workflow engine (config, state, locks, gates,
  safety-allowlisted runner with local no-ff merge + auto-revert), the `gate` /
  `provegate` CLI (`init`, `status`, `queue`, `check`, `run`, `land`, and the
  permanent `push` refusal), the method package (prompts, templates, schemas,
  example gates, METHOD.md), and the quickstart. No runtime dependencies, no
  telemetry, no network calls, no code path that pushes.
