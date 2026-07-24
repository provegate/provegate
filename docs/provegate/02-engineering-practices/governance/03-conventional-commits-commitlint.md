# 03 — Conventional Commits + commitlint

**Invariant.** Commit messages follow Conventional Commits, enforced at commit time via a
`commit-msg` hook. **Type is a hard error** (must be one of feat/fix/docs/…); **scope is a
warning, not a blocker** (validated against a project-maintained enum — an unknown scope is
almost always a not-yet-listed scope or a typo: surface it, don't reject the commit);
subject case is constrained (no sentence/Capitalized/UPPER); the header length cap is
generous and body-line wrapping is disabled so pasted context/URLs aren't rejected.

**Why it matters.** Machine-parseable history feeds changelogs, release automation, and the
protected-branch helper (which derives a branch slug from the subject). Making scope a
*warning* is the key ergonomic call: hard-failing on scope trains people to invent junk
scopes to get past the hook; warning keeps the signal without the friction.

**Mechanism (generic).** See `templates/commitlint.config.js`. Rules:
- `extends: ["@commitlint/config-conventional"]` — inherits `type-enum` (error) and
  `subject-case` (error: forbids sentence/start/pascal/upper-case).
- `"header-max-length": [2, "always", 200]` — raised from the default 100.
- `"body-max-line-length": [0, "always", Infinity]` — disabled (URLs, heredocs, pasted logs
  don't get rejected for line length).
- `"scope-enum": [1, "always", SCOPES]` — **level 1 = warning**. `SCOPES` is a hand-kept
  array of the project's app/package/tooling names.
- Runs from a `commit-msg` hook: `npx commitlint --edit "$1"`.

**Provegate implementation.**
1. `npm i -D @commitlint/cli @commitlint/config-conventional`.
2. Drop `templates/commitlint.config.js` at repo root; replace `SCOPES` with provegate's
   own module/tooling names (or delete `scope-enum` to skip scope validation entirely).
3. Add the `commit-msg` hook (husky: `.husky/commit-msg` → `npx commitlint --edit "$1"`).
4. Document the format `<type>(<scope>): <lowercase subject>` in the bootstrap doc, and
   note "add new scopes to `commitlint.config.js`" so the warning is actionable.

**De-emofy notes.** Replace Emofy's `SCOPES` list wholesale. Everything else in the config
is already tool-agnostic. `pnpm commitlint` → `npx commitlint`.

**Related.** practice 02 (the `wip` helper parses the subject) · `templates/commitlint.config.js`.
