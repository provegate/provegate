---
'provegate': minor
---

`gate check --prompts` — prompt-store reconciliation (PRD-034). The check recomputes the
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
